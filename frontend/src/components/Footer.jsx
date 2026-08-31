export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(168,224,99,0.08)',
      background: 'rgba(8,15,8,0.95)',
      padding: '20px 60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🦢</span>
        <span style={{
          fontFamily: 'var(--head)', fontSize: 14, fontWeight: 700,
          color: 'var(--lime)', letterSpacing: '-0.3px',
        }}>SwanSorts</span>
        <span style={{ color: 'var(--ghost)', fontSize: 13 }}>·</span>
        <span style={{ fontSize: 13, color: 'var(--mist)' }}>
          Built by <span style={{ color: 'var(--lime)', fontWeight: 500 }}>  Manvi Garg</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {[
          {
            label: 'GitHub', url: 'https://github.com/manvigargg',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          },
          {
            label: 'LinkedIn', url: 'https://www.linkedin.com/in/manvigargg/',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          },
        ].map(({ label, url, icon }) => (
          <a key={label} href={url} target="_blank" rel="noreferrer"
            title={label}
            style={{
              color: 'var(--mist)', display: 'flex', alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--lime)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--mist)'}
          >
            {icon}
          </a>
        ))}
        <span style={{ fontSize: 12, color: 'rgba(168,224,99,0.25)' }}>© 2026</span>
      </div>
    </footer>
  )
}
