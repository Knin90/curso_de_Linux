import { Link } from 'react-router-dom'
import { levels, stages } from '../registry'
import { contentRegistry } from '../content/contentRegistry'
import ThemeToggle from '../components/ThemeToggle'
import './landing.css'

const pad = n => String(n).padStart(2, '0')

const featuredIds = [1, 3, 12, 20, 29, 35]

export default function Home() {
  const totalLevels = levels.length
  const available = levels.filter(l => l.status === 'available')
  const comingSoon = levels.filter(l => l.status === 'coming-soon')
  const availableCount = available.length
  const comingSoonCount = comingSoon.length
  const stagesWithLevels = stages.filter(s => levels.some(l => l.stage === s.id))
  const firstAvailable = available.find(l => contentRegistry[l.id]) || available[0]

  const stageTitle = id => {
    const s = stages.find(x => x.id === id)
    return s ? s.title : ''
  }

  return (
    <div className="landing">
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">&gt;_</span>
            Curso de Linux
          </a>
          <nav className="nav-links" aria-label="Navegación">
            <a href="#destacados">Destacados</a>
            <a href="#estructura">Estructura</a>
            <a href="#evaluacion">Evaluación</a>
            <a href="#proyecto">Proyecto final</a>
          </nav>
          <ThemeToggle />
          <a className="nav-cta" href="#estructura">Ver estructura</a>
        </div>
      </header>

      <main id="top">
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="container">
            <span className="eyebrow">De cero a administrador profesional</span>
            <h1>Linux, nivel a nivel</h1>
            <p className="hero-sub">
              Un recorrido de <strong>{stagesWithLevels.length} etapas y {totalLevels} niveles</strong> para
              convertirte en administrador de sistemas: fundamentos, administración, redes, seguridad,
              automatización e infraestructura. Con laboratorios reales y un proyecto final integrador.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="#estructura">Explorar la estructura</a>
              <a className="btn-secondary" href="#evaluacion">Sistema de evaluación →</a>
            </div>
          </div>
        </section>

        {/* ---------- STATS ---------- */}
        <section className="stat-strip">
          <div className="container">
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{totalLevels}</div>
                <div className="stat-label">Niveles (0–{totalLevels - 1})</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stages.length}</div>
                <div className="stat-label">Etapas de aprendizaje</div>
              </div>
              <div className="stat">
                <div className="stat-value">{availableCount}</div>
                <div className="stat-label">Niveles disponibles</div>
              </div>
              <div className="stat">
                <div className="stat-value">{comingSoonCount}</div>
                <div className="stat-label">Niveles en preparación</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- DESTACADOS ---------- */}
        <section className="section" id="destacados">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Contenido destacado</div>
              <h2>Lo esencial, listo para estudiar</h2>
              <p>
                Cada nivel disponible incluye módulos guiados, ejemplos de terminal y un laboratorio
                integrador. Estos son algunos de los niveles más representativos del curso.
              </p>
            </div>
            <div className="new-grid">
              {featuredIds.map(id => {
                const level = levels.find(l => l.id === id)
                if (!level) return null
                const meta = contentRegistry[id]?.meta
                const moduleCount = level.moduleCount || meta?.modules?.length || 0
                return (
                  <article className="new-card" key={id}>
                    <div className="new-card-top">
                      <h3>Nivel {id} · {level.title}</h3>
                      <span className="badge-new">{moduleCount} módulos</span>
                    </div>
                    <p>
                      {meta?.description || 'Nivel completo con módulos guiados y laboratorio integrador.'}
                    </p>
                    <div className="tools"><span>Etapa</span> {stageTitle(level.stage)}</div>
                    <Link className="btn-secondary" style={{ fontSize: 14 }} to={`/nivel/${id}`}>
                      Entrar al nivel →
                    </Link>
                  </article>
                )
              })}
            </div>
            <p className="new-note">
              <strong>Y lo que viene:</strong>{' '}
              <span className="mono">{comingSoon.map(l => `N${l.id} ${l.title}`).join(' · ')}</span>
            </p>
          </div>
        </section>

        {/* ---------- ESTRUCTURA ---------- */}
        <section className="section" id="estructura">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Índice general</div>
              <h2>Las etapas, nivel a nivel</h2>
              <p>
                {totalLevels} niveles numerados del 0 al {totalLevels - 1}, organizados en una
                progresión que va de los fundamentos hasta el perfil profesional.
              </p>
            </div>

            {stages.map(stage => {
              const stageLevels = levels.filter(l => l.stage === stage.id)
              if (stageLevels.length === 0) return null
              const firstId = stageLevels[0].id
              const lastId = stageLevels[stageLevels.length - 1].id
              return (
                <section className="stage" key={stage.id}>
                  <div className="stage-head">
                    <span className="stage-num">ETAPA {stage.id}</span>
                    <h3>{stage.title}</h3>
                    <span className="stage-count">Niveles {firstId}–{lastId} · {stageLevels.length}</span>
                  </div>
                  <ul className="level-list">
                    {stageLevels.map(level => (
                      <li className="level" key={level.id}>
                        <span className="level-num">{pad(level.id)}</span>
                        {level.status === 'available' ? (
                          <Link className="level-title" to={`/nivel/${level.id}`}>{level.title}</Link>
                        ) : (
                          <span className="level-title">{level.title}</span>
                        )}
                        <span className="level-tags">
                          {level.status === 'available' ? (
                            <span className="tag tag-new">Disponible</span>
                          ) : (
                            <span className="tag tag-ext">Próximamente</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </section>

        {/* ---------- EVALUACION ---------- */}
        <section className="section" id="evaluacion">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Sistema de evaluación</div>
              <h2>Mide tu progreso en cada paso</h2>
              <p>
                Evaluación continua por nivel, exámenes por etapa y un mapeo directo a
                certificaciones reales del sector.
              </p>
            </div>

            <div className="eval-grid">
              <article className="eval-card">
                <div className="eval-index">01</div>
                <h3>Quiz por nivel</h3>
                <p>Al cerrar cada nivel, un cuestionario corto confirma que los conceptos quedaron
                asentados antes de avanzar.</p>
                <div className="meta">8–10 preguntas · {totalLevels} niveles</div>
              </article>
              <article className="eval-card">
                <div className="eval-index">02</div>
                <h3>Examen de etapa</h3>
                <p>Al cierre de cada etapa: preguntas más un laboratorio evaluado que pone a prueba
                los conocimientos acumulados de forma práctica.</p>
                <div className="meta">30 preguntas + 1 laboratorio · {stages.length} etapas</div>
              </article>
              <article className="eval-card">
                <div className="eval-index">03</div>
                <h3>Mapeo a certificaciones</h3>
                <p>Cada etapa se alinea con certificaciones reconocidas de la industria, para dar un
                valor comercial claro a lo aprendido.</p>
                <div className="meta">CompTIA · LPIC · RHCSA · RHCE · CKA</div>
              </article>
            </div>

            <div className="cert-wrap">
              <div className="cert-head">
                <h3>Ruta de certificación</h3>
                <span>— de la base hasta el perfil DevOps / Cloud</span>
              </div>
              <div className="cert-row">
                <span className="cert-stage">Etapas 1–2</span>
                <div className="cert-certs"><span className="tag main">CompTIA Linux+</span><span className="tag main">LPIC-1</span></div>
              </div>
              <div className="cert-row">
                <span className="cert-stage">Etapas 3–4</span>
                <div className="cert-certs"><span className="tag">LPIC-2</span><span className="tag">RHCSA</span></div>
              </div>
              <div className="cert-row">
                <span className="cert-stage">Etapas 5–6</span>
                <div className="cert-certs"><span className="tag">RHCE</span><span className="tag">CKA (Kubernetes)</span><span className="tag">Rutas DevOps / Cloud</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PROYECTO ---------- */}
        <section className="section" id="proyecto">
          <div className="container">
            <div className="section-head">
              <div className="section-kicker">Proyecto final integrador</div>
              <h2>Un servidor real, de Internet a la nube</h2>
              <p>El alumno instala, configura, asegura, automatiza y respalda un entorno completo.
              Todo lo aprendido converge en este diagrama.</p>
            </div>

            <div className="diagram">
              <div className="diagram-flow">
                <div className="node accent"><span className="ic">IN</span><div><div className="node-label">Internet</div><div className="node-meta">tráfico externo</div></div></div>
                <div className="edge"></div>
                <div className="node"><span className="ic">FW</span><div><div className="node-label">Firewall</div><div className="node-meta">nftables / firewalld</div></div></div>
                <div className="edge"></div>
                <div className="node"><span className="ic">SV</span><div><div className="node-label">Servidor Linux</div><div className="node-meta">usuarios SSH · Nginx (proxy + TLS) · Docker</div></div></div>
                <div className="edge"></div>
                <div className="node"><span className="ic">AU</span><div><div className="node-label">Automatización</div><div className="node-meta">Bash + procesamiento de texto</div></div></div>
                <div className="edge"></div>
                <div className="branch">
                  <div className="node"><span className="ic">BK</span><div><div className="node-label">Backups</div><div className="node-meta">tar / rsync</div></div></div>
                  <div className="node"><span className="ic">MO</span><div><div className="node-label">Monitorización</div><div className="node-meta">estado y alertas</div></div></div>
                  <div className="node"><span className="ic">LG</span><div><div className="node-label">Logs y Auditoría</div><div className="node-meta">registro y trazabilidad</div></div></div>
                </div>
                <div className="edge"></div>
                <div className="node"><span className="ic">IA</span><div><div className="node-label">Ansible + Terraform</div><div className="node-meta">configuración + aprovisionamiento</div></div></div>
                <div className="edge"></div>
                <div className="node"><span className="ic">CL</span><div><div className="node-label">Despliegue automático en la nube</div><div className="node-meta">entorno productivo</div></div></div>
              </div>
              <p className="diagram-foot">
                <strong>Novedad clave:</strong> el paso de backup real — respaldar y verificar la
                restauración de todo el entorno.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- CTA FINAL ---------- */}
        <section className="final-cta">
          <div className="container">
            <h2>¿Listo para administrar tu primer servidor?</h2>
            <p>
              {totalLevels} niveles, {stages.length} etapas y un proyecto final que te deja preparado
              para certificaciones Linux de la industria.
            </p>
            {firstAvailable && (
              <Link className="btn-primary" to={`/nivel/${firstAvailable.id}`}>
                Empezar por el nivel {firstAvailable.id}
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Curso de Linux · De cero a administrador profesional</span>
          <span>{totalLevels} niveles · {stages.length} etapas · proyecto final integrador</span>
        </div>
      </footer>
    </div>
  )
}
