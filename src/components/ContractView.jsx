import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { buildContract } from '../contract'
import { FEATURES } from '../features'
import { useSettings } from '../settings'

function FeatureTag({ feature, featureTitle }) {
  if (!feature) return null
  return <span className="tag-p2">Phase 2 · {featureTitle(feature)}</span>
}

function statusClass(status) {
  if (status >= 500) return 'bad'
  if (status >= 400) return 'warn'
  return 'ok'
}

function Endpoint({ endpoint: e, featureTitle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`endpoint ep-${e.method.toLowerCase()}`}>
      <button className="endpoint-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`method m-${e.method.toLowerCase()}`}>{e.method}</span>
        <span className="endpoint-path">{e.path}</span>
        <span className="endpoint-summary muted small">{e.summary}</span>
        <ChevronDown size={16} className={`chev ${open ? 'rot' : ''}`} />
      </button>
      {(e.feature || e.queryFeature) && !open && (
        <div className="endpoint-tags">
          <FeatureTag feature={e.feature ?? e.queryFeature} featureTitle={featureTitle} />
        </div>
      )}

      {open && (
        <div className="endpoint-body">
          {e.feature && <FeatureTag feature={e.feature} featureTitle={featureTitle} />}
          {e.note && <p className="muted small">{e.note}</p>}

          {e.query && (
            <section>
              <h4>
                Query params <FeatureTag feature={e.queryFeature} featureTitle={featureTitle} />
              </h4>
              <table className="schema">
                <tbody>
                  {e.query.map((q) => (
                    <tr key={q.name}>
                      <td><code>{q.name}</code></td>
                      <td className="muted"><code>{q.type}</code></td>
                      <td>{q.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {e.queryNote && <p className="muted small">{e.queryNote}</p>}
              {e.example && <pre className="code">{e.example}</pre>}
            </section>
          )}

          {e.body && (
            <section>
              <h4>Request body <span className="muted small">application/json</span></h4>
              <pre className="code">{e.body}</pre>
            </section>
          )}

          <section>
            <h4>Responses</h4>
            {e.responses.map((r) => (
              <div key={r.status} className="response">
                <div className="response-head">
                  <span className={`status ${statusClass(r.status)}`}>{r.status}</span>
                  <span className="small">{r.description}</span>
                </div>
                {r.example && <pre className="code">{r.example}</pre>}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}

export default function ContractView() {
  const { settings } = useSettings()
  const f = settings.features
  const { fields, endpoints, featureTitle } = buildContract(f)
  const active = FEATURES.filter((x) => f[x.key])

  return (
    <div className="contract">
      <p className="muted small intro">
        What the app expects from your API <strong>right now</strong>: the Phase 1 CRUD
        {active.length ? (
          <> plus {active.map((x) => x.title).join(', ')}.</>
        ) : (
          <>. Phase 2 endpoints show up here as you turn them on.</>
        )}{' '}
        JSON uses camelCase. Errors use the ProblemDetails format. The app doesn't validate anything itself: the API must enforce the rules below.
      </p>

      <h3 className="contract-h">Item</h3>
      <table className="schema">
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Rules</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((fl) => (
            <tr key={fl.name}>
              <td>
                <code>{fl.name}</code>
              </td>
              <td className="muted">
                <code>{fl.type}</code>
              </td>
              <td>
                {fl.rule} <FeatureTag feature={fl.feature} featureTitle={featureTitle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="contract-h">Endpoints</h3>
      {endpoints.map((e) => (
        <Endpoint key={`${e.method} ${e.path}`} endpoint={e} featureTitle={featureTitle} />
      ))}
    </div>
  )
}
