import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      borderBottomLeftRadius: 'var(--radius-lg)',
      borderBottomRightRadius: 'var(--radius-lg)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
          Total: <strong style={{ color: 'var(--text)' }}>{totalItems}</strong>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              background: 'var(--surface)',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
          Página <strong style={{ color: 'var(--text)' }}>{currentPage}</strong> de {totalPages || 1}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: currentPage <= 1 ? 'var(--surface2)' : 'var(--surface)',
              color: currentPage <= 1 ? 'var(--text3)' : 'var(--text)',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages || totalPages === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: (currentPage >= totalPages || totalPages === 0) ? 'var(--surface2)' : 'var(--surface)',
              color: (currentPage >= totalPages || totalPages === 0) ? 'var(--text3)' : 'var(--text)',
              cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
