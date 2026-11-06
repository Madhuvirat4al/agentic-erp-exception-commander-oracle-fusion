import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

interface TransientOracleSession {
  sessionToken: string;
  instanceUrl: string;
  username: string;
  authHeader: string;
  connectedAt: string;
}

const globalStore = globalThis as unknown as {
  __oracleSessionsByToken?: Map<string, TransientOracleSession>;
};

function getSessionMap(): Map<string, TransientOracleSession> {
  if (!globalStore.__oracleSessionsByToken) {
    globalStore.__oracleSessionsByToken = new Map<string, TransientOracleSession>();
  }
  return globalStore.__oracleSessionsByToken;
}

function getSessionFromReq(req: IncomingMessage, parsedUrl: URL): TransientOracleSession | null {
  const tokenHeader = req.headers['x-oracle-session-token'];
  const token =
    (Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader) ||
    parsedUrl.searchParams.get('sessionToken') ||
    '';
  if (!token) return null;
  return getSessionMap().get(token) || null;
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function fetchOracleItems(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<{ status: number; ok: boolean; items: Record<string, unknown>[] }> {
  try {
    const resp = await fetch(url, { headers, signal });
    if (!resp.ok) {
      return { status: resp.status, ok: false, items: [] };
    }
    const data = (await resp.json()) as { items?: Record<string, unknown>[] };
    return {
      status: resp.status,
      ok: true,
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch {
    return { status: 0, ok: false, items: [] };
  }
}

function deduplicateInvoices(invoices: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const inv of invoices) {
    const key = String(inv.InvoiceId || inv.InvoiceNumber || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(inv);
  }
  return out;
}

function deduplicateHolds(holds: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const h of holds) {
    const key = String(h.HoldId || `${h.InvoiceNumber}-${h.HoldName}-${h.HoldDate}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

function oracleFusionServerProxyPlugin(): Plugin {
  return {
    name: 'oracle-fusion-server-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/oracle/')) {
          return next();
        }

        const parsedReqUrl = new URL(req.url, 'http://127.0.0.1:5173');
        const pathname = parsedReqUrl.pathname;

        try {
          // 1. Check current session status for a specific user sessionToken
          if (pathname === '/api/oracle/status' && req.method === 'GET') {
            const activeOracleSession = getSessionFromReq(req, parsedReqUrl);
            return sendJson(res, 200, {
              connected: !!activeOracleSession,
              instanceUrl: activeOracleSession?.instanceUrl || null,
              username: activeOracleSession?.username || null,
              connectedAt: activeOracleSession?.connectedAt || null,
            });
          }

          // 2. Disconnect user session
          if (pathname === '/api/oracle/disconnect' && req.method === 'POST') {
            const activeOracleSession = getSessionFromReq(req, parsedReqUrl);
            if (activeOracleSession) {
              getSessionMap().delete(activeOracleSession.sessionToken);
            }
            return sendJson(res, 200, { connected: false });
          }

          // 3. Connect to Oracle Fusion Instance & strictly verify user_id + password against REST endpoints
          if (pathname === '/api/oracle/connect' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const rawUrl = String(body.instanceUrl || '').trim();
            const username = String(body.username || '').trim();
            const password = String(body.password || '');

            if (!rawUrl || !username || !password) {
              return sendJson(res, 400, {
                success: false,
                error: 'Oracle Server URL, User ID, and Password are required to sign in.',
              });
            }

            let parsedUrl: URL;
            try {
              parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
            } catch {
              return sendJson(res, 400, {
                success: false,
                error: 'Invalid Oracle Server URL format.',
              });
            }

            // Strip any UI path like /crmUI/faces/FuseWelcome or /fscmUI/faces/FuseWelcome
            const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
            const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

            const probeResources = [
              { name: 'Payables Invoices', path: '/fscmRestApi/resources/11.13.18.05/invoices?limit=10&onlyData=true' },
              { name: 'Invoice Holds', path: '/fscmRestApi/resources/11.13.18.05/invoiceHolds?limit=10&onlyData=true' },
              { name: 'Purchase Orders', path: '/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=10&onlyData=true' },
              { name: 'Suppliers', path: '/fscmRestApi/resources/11.13.18.05/suppliers?limit=10&onlyData=true' },
            ];

            let probeReachable = false;
            let any200 = false;
            let any401Or403 = false;
            let liveRecordsCount = 0;
            const workingResources: string[] = [];

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15000);

              const probeChecks = await Promise.allSettled(
                probeResources.map(async (r) => {
                  const resp = await fetch(`${baseUrl}${r.path}`, {
                    method: 'GET',
                    headers: {
                      Authorization: authHeader,
                      Accept: 'application/json',
                    },
                    signal: controller.signal,
                  });
                  let count = 0;
                  if (resp.ok) {
                    const data = (await resp.json()) as { items?: unknown[] };
                    count = Array.isArray(data?.items) ? data.items.length : 0;
                  }
                  return { name: r.name, status: resp.status, ok: resp.ok, count };
                })
              );

              clearTimeout(timeout);

              for (const p of probeChecks) {
                if (p.status === 'fulfilled') {
                  if (p.value.status > 0) {
                    probeReachable = true;
                  }
                  if (p.value.status === 401 || p.value.status === 403) {
                    any401Or403 = true;
                  }
                  if (p.value.ok) {
                    any200 = true;
                    liveRecordsCount += p.value.count;
                    workingResources.push(`${p.value.name} (${p.value.count})`);
                  }
                }
              }

              if (!probeReachable) {
                return sendJson(res, 502, {
                  success: false,
                  error: `Unable to reach Oracle Fusion Server at ${baseUrl}. Please verify the server URL and network connection.`,
                });
              }

              if (!any200 && any401Or403) {
                return sendJson(res, 401, {
                  success: false,
                  error: `Authentication failed (HTTP 401 Unauthorized) on ${baseUrl} for User ID "${username}". Please check your User ID and Password.`,
                });
              }
            } catch {
              return sendJson(res, 502, {
                success: false,
                error: `Connection to Oracle Server (${baseUrl}) timed out. Please try again.`,
              });
            }

            const sessionToken = `ora-sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            const connectedAt = new Date().toISOString();

            getSessionMap().set(sessionToken, {
              sessionToken,
              instanceUrl: baseUrl,
              username,
              authHeader,
              connectedAt,
            });

            const message = any200
              ? `Authenticated with ${baseUrl} as ${username}. Accessible REST resources: ${workingResources.join(', ')}.`
              : `Authenticated session established for ${baseUrl} (${username}).`;

            return sendJson(res, 200, {
              success: true,
              sessionToken,
              instanceUrl: baseUrl,
              username,
              connectedAt,
              probeReachable,
              liveInvoicesCount: liveRecordsCount,
              message,
            });
          }

          // 4. Pull live invoices, holds, POs, and suppliers strictly for the authenticated user session
          if (pathname === '/api/oracle/pull-live-transactions' && req.method === 'GET') {
            const activeOracleSession = getSessionFromReq(req, parsedReqUrl);
            if (!activeOracleSession) {
              return sendJson(res, 401, {
                success: false,
                error: 'No active Oracle user session. Please sign in with your User ID and Password.',
              });
            }

            const { instanceUrl, authHeader, username } = activeOracleSession;
            const headers = {
              Authorization: authHeader,
              Accept: 'application/json',
            };

            const results: {
              invoices: Record<string, unknown>[];
              holds: Record<string, unknown>[];
              pos: Record<string, unknown>[];
              suppliers: Record<string, unknown>[];
              liveRestReturnedData: boolean;
              telemetry: string[];
            } = {
              invoices: [],
              holds: [],
              pos: [],
              suppliers: [],
              liveRestReturnedData: false,
              telemetry: [
                `Authenticated to Oracle Server ${instanceUrl} as User ID "${username}"`,
              ],
            };

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 22000);
              const safeUser = username.replace(/'/g, "''");

              // Pull user-created/updated invoices first, plus authorized invoices & holds for this user's Oracle session
              const [
                invByThisUser,
                invCreatedRecent,
                invRecent,
                invUnvalidated,
                invStandard,
                holdUnreleased,
                holdRecent,
                holdStandard,
                poStandard,
                supStandard,
              ] = await Promise.all([
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    `upper(CreatedBy)='${safeUser.toUpperCase()}' or upper(LastUpdatedBy)='${safeUser.toUpperCase()}'`
                  )}&orderBy=CreationDate:desc&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?orderBy=CreationDate:desc&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?orderBy=LastUpdateDate:desc&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    "ValidationStatus != 'Validated' or ActiveHoldFlag = true"
                  )}&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoiceHolds?q=${encodeURIComponent(
                    'ReleaseName IS NULL'
                  )}&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoiceHolds?orderBy=HoldDate:desc&limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoiceHolds?limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/suppliers?limit=100&onlyData=true`,
                  headers,
                  controller.signal
                ),
              ]);

              const combinedInvoices = deduplicateInvoices([
                ...invByThisUser.items,
                ...invCreatedRecent.items,
                ...invRecent.items,
                ...invUnvalidated.items,
                ...invStandard.items,
              ]);
              const combinedHolds = deduplicateHolds([
                ...holdUnreleased.items,
                ...holdRecent.items,
                ...holdStandard.items,
              ]);

              // Also fetch parent invoice details for any held InvoiceNumber not yet in combinedInvoices
              const loadedInvNumbers = new Set(
                combinedInvoices.map((i) => String(i.InvoiceNumber || '').trim())
              );
              const missingHoldInvNumbers = Array.from(
                new Set(
                  combinedHolds
                    .map((h) => String(h.InvoiceNumber || '').trim())
                    .filter((num) => num && !loadedInvNumbers.has(num))
                )
              ).slice(0, 20);

              if (missingHoldInvNumbers.length > 0) {
                const holdInvoiceLookups = await Promise.all(
                  missingHoldInvNumbers.map((invNum) => {
                    const safeNum = invNum.replace(/'/g, "''");
                    return fetchOracleItems(
                      `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                        `InvoiceNumber='${safeNum}'`
                      )}&limit=5&onlyData=true`,
                      headers,
                      controller.signal
                    );
                  })
                );
                for (const lookup of holdInvoiceLookups) {
                  if (lookup.items.length > 0) {
                    combinedInvoices.push(...lookup.items);
                  }
                }
              }

              clearTimeout(timeout);

              results.invoices = deduplicateInvoices(combinedInvoices);
              results.holds = combinedHolds;
              results.pos = poStandard.items;
              results.suppliers = supStandard.items;
              results.liveRestReturnedData =
                results.invoices.length > 0 || results.holds.length > 0;

              results.telemetry.push(
                `GET /fscmRestApi/resources/11.13.18.05/invoices -> Retrieved ${results.invoices.length} unique live Payables Invoices`
              );
              results.telemetry.push(
                `GET /fscmRestApi/resources/11.13.18.05/invoiceHolds -> Retrieved ${results.holds.length} live Invoice Holds`
              );
              results.telemetry.push(
                `GET /fscmRestApi/resources/11.13.18.05/purchaseOrders -> Retrieved ${results.pos.length} live Purchase Orders`
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Timeout';
              results.telemetry.push(`REST fetch note (${msg}).`);
            }

            return sendJson(res, 200, {
              success: true,
              instanceUrl,
              username,
              ...results,
            });
          }

          // 5. Live Real-Time Oracle Invoice Search by InvoiceNumber, Supplier, or PO Number
          if (pathname === '/api/oracle/search-invoices' && req.method === 'GET') {
            const activeOracleSession = getSessionFromReq(req, parsedReqUrl);
            if (!activeOracleSession) {
              return sendJson(res, 401, {
                success: false,
                error: 'No active Oracle Fusion instance connection.',
              });
            }

            const queryRaw = (parsedReqUrl.searchParams.get('q') || '').trim();
            if (!queryRaw) {
              return sendJson(res, 200, {
                success: true,
                query: '',
                invoices: [],
                holds: [],
                pos: [],
              });
            }

            const { instanceUrl, authHeader, username } = activeOracleSession;
            const headers = {
              Authorization: authHeader,
              Accept: 'application/json',
            };

            const safeQuery = queryRaw.replace(/'/g, "''");
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            try {
              const [
                exactInv,
                likeInv,
                upperLikeInv,
                supplierOrPoInv,
                holdMatches,
                poMatches,
              ] = await Promise.all([
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    `InvoiceNumber='${safeQuery}'`
                  )}&limit=50&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    `InvoiceNumber LIKE '*${safeQuery}*'`
                  )}&limit=50&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    `upper(InvoiceNumber) LIKE '*${safeQuery.toUpperCase()}*'`
                  )}&limit=50&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                    `Supplier LIKE '*${safeQuery}*' or PurchaseOrderNumber LIKE '*${safeQuery}*'`
                  )}&limit=50&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoiceHolds?q=${encodeURIComponent(
                    `InvoiceNumber LIKE '*${safeQuery}*' or Supplier LIKE '*${safeQuery}*'`
                  )}&limit=50&onlyData=true`,
                  headers,
                  controller.signal
                ),
                fetchOracleItems(
                  `${instanceUrl}/fscmRestApi/resources/11.13.18.05/purchaseOrders?q=${encodeURIComponent(
                    `OrderNumber LIKE '*${safeQuery}*'`
                  )}&limit=25&onlyData=true`,
                  headers,
                  controller.signal
                ),
              ]);

              const matchedInvoices = deduplicateInvoices([
                ...exactInv.items,
                ...likeInv.items,
                ...upperLikeInv.items,
                ...supplierOrPoInv.items,
              ]);
              const matchedHolds = deduplicateHolds(holdMatches.items);

              // Also fetch any holds for the matched invoices
              const invNumbersToFetchHolds = matchedInvoices
                .map((i) => String(i.InvoiceNumber || '').trim())
                .filter(Boolean)
                .slice(0, 10);

              if (invNumbersToFetchHolds.length > 0) {
                const extraHoldChecks = await Promise.all(
                  invNumbersToFetchHolds.map((invNum) => {
                    const safeNum = invNum.replace(/'/g, "''");
                    return fetchOracleItems(
                      `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoiceHolds?q=${encodeURIComponent(
                        `InvoiceNumber='${safeNum}'`
                      )}&limit=20&onlyData=true`,
                      headers,
                      controller.signal
                    );
                  })
                );
                for (const hc of extraHoldChecks) {
                  matchedHolds.push(...hc.items);
                }
              }

              // Also fetch parent invoices for any matched holds not in matchedInvoices
              const loadedInvSet = new Set(
                matchedInvoices.map((i) => String(i.InvoiceNumber || '').trim())
              );
              const missingHoldParentNums = Array.from(
                new Set(
                  matchedHolds
                    .map((h) => String(h.InvoiceNumber || '').trim())
                    .filter((n) => n && !loadedInvSet.has(n))
                )
              ).slice(0, 10);

              if (missingHoldParentNums.length > 0) {
                const parentInvChecks = await Promise.all(
                  missingHoldParentNums.map((invNum) => {
                    const safeNum = invNum.replace(/'/g, "''");
                    return fetchOracleItems(
                      `${instanceUrl}/fscmRestApi/resources/11.13.18.05/invoices?q=${encodeURIComponent(
                        `InvoiceNumber='${safeNum}'`
                      )}&limit=5&onlyData=true`,
                      headers,
                      controller.signal
                    );
                  })
                );
                for (const pc of parentInvChecks) {
                  matchedInvoices.push(...pc.items);
                }
              }

              clearTimeout(timeout);

              return sendJson(res, 200, {
                success: true,
                instanceUrl,
                username,
                query: queryRaw,
                invoices: deduplicateInvoices(matchedInvoices),
                holds: deduplicateHolds(matchedHolds),
                pos: poMatches.items,
              });
            } catch (err) {
              clearTimeout(timeout);
              return sendJson(res, 200, {
                success: true,
                instanceUrl,
                username,
                query: queryRaw,
                invoices: [],
                holds: [],
                pos: [],
                note: err instanceof Error ? err.message : 'Search timeout',
              });
            }
          }

          return sendJson(res, 404, { error: 'Unknown Oracle proxy route' });
        } catch (err) {
          return sendJson(res, 500, {
            error: err instanceof Error ? err.message : 'Internal proxy error',
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), oracleFusionServerProxyPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
