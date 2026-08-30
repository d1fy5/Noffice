import { useRef } from 'react';
import Icon from './Icon.jsx';
import { useTranslation } from '../store/useTranslation.js';

export default function FileDropzone({ file, onFile, error }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const handleFiles = (list) => {
    if (list && list.length) onFile(list[0]);
  };

  return (
    <div>
      <div
        className={`dropzone ${error ? 'dropzone-error' : ''}`}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current && inputRef.current.click();
          }
        }}
        aria-label={t('doc.upload.file')}
      >
        {file ? (
          <div className="dropzone-file">
            <span className="drop-file-icon"><Icon name="file" size={24} /></span>
            <div>
              <div className="drop-file-name">{file.name}</div>
              <div className="drop-file-size">{formatSize(file.size)}</div>
            </div>
          </div>
        ) : (
          <>
            <span className="drop-icon"><Icon name="upload" size={26} /></span>
            <div className="drop-title">{t('doc.upload.dropTitle')}</div>
            <div className="drop-text">{t('doc.upload.dropText')}</div>
            <div className="drop-formats">{t('doc.upload.dropFormats')}</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}
