import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronDown, User, Package, Scissors, Heart } from 'lucide-react'

interface AutocompleteSearchProps {
  placeholder: string
  items: any[]
  onSelect: (item: any) => void
  selectedValue?: any
  onClear?: () => void
  labelKey: string
  sublabelKey?: string
  iconType?: 'customer' | 'product' | 'service' | 'pet'
  disabled?: boolean
  style?: React.CSSProperties
  loading?: boolean
}

export default function AutocompleteSearch({
  placeholder,
  items,
  onSelect,
  selectedValue,
  onClear,
  labelKey,
  sublabelKey,
  iconType,
  disabled = false,
  style = {},
  loading = false,
}: AutocompleteSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync internal search input with selectedValue
  useEffect(() => {
    if (selectedValue) {
      setSearch(selectedValue[labelKey] || '')
    } else {
      setSearch('')
    }
  }, [selectedValue, labelKey])

  // Filter items based on search query
  const filtered = items.filter((item) => {
    const term = search.toLowerCase()
    const label = (item[labelKey] || '').toLowerCase()
    const sublabel = sublabelKey && item[sublabelKey] ? String(item[sublabelKey]).toLowerCase() : ''
    
    return label.includes(term) || sublabel.includes(term)
  })

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (selectedValue) {
          setSearch(selectedValue[labelKey] || '')
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedValue, labelKey])

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [search])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex])
        } else if (filtered.length > 0) {
          handleSelect(filtered[0])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        if (selectedValue) {
          setSearch(selectedValue[labelKey] || '')
        } else {
          setSearch('')
        }
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        if (selectedValue) {
          setSearch(selectedValue[labelKey] || '')
        } else {
          setSearch('')
        }
        break
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement
      if (activeEl) {
        const listEl = listRef.current
        const activeTop = activeEl.offsetTop
        const activeBottom = activeTop + activeEl.offsetHeight
        const listScrollTop = listEl.scrollTop
        const listHeight = listEl.clientHeight

        if (activeBottom > listScrollTop + listHeight) {
          listEl.scrollTop = activeBottom - listHeight
        } else if (activeTop < listScrollTop) {
          listEl.scrollTop = activeTop
        }
      }
    }
  }, [highlightedIndex])

  const handleSelect = (item: any) => {
    onSelect(item)
    setSearch(item[labelKey] || '')
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearch('')
    if (onClear) onClear()
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>
    const cleanQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`(${cleanQuery})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                background: 'var(--green-light)',
                color: 'var(--ok)',
                fontWeight: 700,
                borderRadius: '3px',
                padding: '0 2px',
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    )
  }

  const renderIcon = () => {
    const iconSize = 15
    const iconColor = 'var(--text2)'
    if (loading) {
      return (
        <svg
          style={{
            animation: 'spin 1s linear infinite',
            width: iconSize,
            height: iconSize,
            color: 'var(--green)',
            flexShrink: 0,
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )
    }

    switch (iconType) {
      case 'customer':
        return <User size={iconSize} color={iconColor} style={{ flexShrink: 0 }} />
      case 'product':
        return <Package size={iconSize} color={iconColor} style={{ flexShrink: 0 }} />
      case 'service':
        return <Scissors size={iconSize} color={iconColor} style={{ flexShrink: 0 }} />
      case 'pet':
        return <Heart size={iconSize} color={iconColor} style={{ flexShrink: 0 }} />
      default:
        return <Search size={iconSize} color={iconColor} style={{ flexShrink: 0 }} />
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'var(--font)',
        ...style,
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <div
          style={{
            position: 'absolute',
            left: 12,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {renderIcon()}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 36px 10px 38px',
            border: isOpen ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
            borderRadius: '10px',
            fontSize: '14px',
            color: 'var(--text)',
            background: 'var(--surface)',
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'inset 0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all .15s ease',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {(search || selectedValue) && !disabled ? (
            <button
              onClick={handleClear}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text3)',
                padding: 2,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text2)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={14} color="var(--text3)" style={{ pointerEvents: 'none' }} />
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '230px',
            overflowY: 'auto',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '4px',
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text2)', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {renderIcon()}
              <span>Buscando resultados...</span>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item, index) => {
              const isSelected = selectedValue && selectedValue.id === item.id
              const isHighlighted = index === highlightedIndex

              return (
                <div
                  key={item.id || index}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    margin: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    background: isSelected
                      ? 'var(--green-xlight)'
                      : isHighlighted
                      ? 'var(--surface2)'
                      : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--green-dark)' : 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span>{highlightMatch(item[labelKey] || '', search)}</span>
                    
                    {iconType === 'product' && 'stock' in item && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '20px',
                          background: item.stock === 0 ? 'var(--out-bg)' : 'var(--green-xlight)',
                          color: item.stock === 0 ? 'var(--out)' : 'var(--green-dark)',
                          border: item.stock === 0 ? '1px solid rgba(153, 27, 27, 0.15)' : '1px solid rgba(5, 150, 105, 0.15)',
                        }}
                      >
                        {item.stock === 0 ? 'Agotado' : `${item.stock} disp.`}
                      </span>
                    )}
                  </div>

                  {sublabelKey && item[sublabelKey] && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: isSelected ? 'var(--green)' : 'var(--text2)',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {iconType === 'customer' && <span>📞 {highlightMatch(String(item[sublabelKey]), search)}</span>}
                      {iconType === 'product' && 'sku' in item && item.sku && <span>SKU: {highlightMatch(String(item[sublabelKey]), search)}</span>}
                      {iconType === 'pet' && 'species' in item && <span>Raza/Especie: {highlightMatch(String(item[sublabelKey]), search)}</span>}
                      {iconType !== 'customer' && (!['product', 'pet'].includes(iconType || '') || !('sku' in item || 'species' in item)) && (
                        <span>{highlightMatch(String(item[sublabelKey]), search)}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <div style={{ fontSize: '24px', opacity: 0.6 }}>🐾</div>
              <span style={{ fontWeight: 600, color: 'var(--text2)' }}>No se encontraron resultados</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>Intenta con otros términos para "{search}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
