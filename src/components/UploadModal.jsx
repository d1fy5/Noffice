import { useState } from 'react';
import { useStore, UPLOAD_CATEGORIES } from '../store/StoreContext.jsx';
import { useTranslation } from '../store/useTranslation.js';
import { useToast } from '../store/ToastContext.jsx';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import FormField from './FormField.jsx';
import FileDropzone from './FileDropzone.jsx';

const MAX_SIZE = 50 * 1024 * 1024;

export default function UploadModal({ open, onClose }) {
  const { t } = useTranslation();
  const { addDocuments } = useStore();
  const { notify } = useToast();

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(UPLOAD_CATEGORIES[0]);
  const [errors, setErrors] = useState({});

  const reset = () => {
    setFile(null);
    setName('');
    setDescription('');
    setCategory(UPLOAD_CATEGORIES[0]);
    setErrors({});
  };

  const handleFile = (f) => {
    if (f && f.size > MAX_SIZE) {
      setErrors((e) => ({ ...e, file: t('doc.upload.tooLarge') }));
      return;
    }
    setErrors((e) => ({ ...e, file: null, name: null }));
    setFile(f);
  };

  const submit = () => {
    const errs = {};
    if (!file) errs.file = t('doc.upload.reqFile');
    if (!name.trim()) errs.name = t('doc.upload.reqName');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    addDocuments([{ file, name, description, category }]);
    notify(t('action.upload') + ' — ' + name);
    reset();
    onClose();
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('doc.upload.title')}
      footerContent={
        <div className="modal-footer-btns">
          <Button variant="secondary" onClick={close}>{t('action.cancel')}</Button>
          <Button variant="primary" icon="upload" onClick={submit}>{t('action.upload')}</Button>
        </div>
      }
    >
      <FormField label={t('doc.upload.fileName')} htmlFor="up-name" required error={errors.name}>
        <input
          className="form-input"
          id="up-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={file ? file.name : 'document-name.pdf'}
          aria-invalid={!!errors.name}
        />
      </FormField>

      <FormField label={t('doc.upload.desc')} htmlFor="up-desc" hint={t('doc.upload.descHint')}>
        <textarea
          className="form-textarea"
          id="up-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label={t('doc.upload.desc')}
        />
      </FormField>

      <FormField label={t('doc.upload.category') || 'Category'} htmlFor="up-cat">
        <select
          className="form-select"
          id="up-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {UPLOAD_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </FormField>

      <FormField label={t('doc.upload.file')} required error={errors.file}>
        <FileDropzone file={file} onFile={handleFile} error={errors.file} />
      </FormField>
    </Modal>
  );
}
