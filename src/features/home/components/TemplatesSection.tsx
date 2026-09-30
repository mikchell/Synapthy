import { useMindmapStore } from '../../mindmap/store/mindmapStore'
import { TEMPLATES, TemplateDescription } from '../../mindmap/components/TemplateSelectModal'

export function TemplatesSection() {
  const addSheet = useMindmapStore((s) => s.addSheet)

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {TEMPLATES.map(({ type, label, desc, uses, preview }) => (
        <button
          key={type}
          onClick={() => addSheet(type)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 12,
            width: 220,
            textAlign: 'left',
            padding: '20px 16px',
            borderRadius: 16,
            border: '1.5px solid rgba(0,0,0,0.08)',
            background: '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'
            e.currentTarget.style.background = '#f5f3ff'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
            e.currentTarget.style.background = '#fafafa'
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{ background: '#f5f3ff', borderRadius: 10, padding: 8 }}>{preview}</div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#1e1b4b' }}>{label}</p>
            <TemplateDescription desc={desc} uses={uses} />
          </div>
        </button>
      ))}
    </div>
  )
}
