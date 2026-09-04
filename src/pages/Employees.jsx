import { useEffect, useMemo, useState } from 'react';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../store/constants.js';
import { useTranslation } from '../store/useTranslation.js';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import PageHeader from '../components/PageHeader.jsx';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  department: '',
  role: '',
  email: '',
  status: 'Active',
};

const PAGE_SIZE = 8;

const PAGE_WINDOW = 2;

export default function Employees() {
  const { query } = useSearch();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = employees;
    if (status !== 'all') rows = rows.filter((e) => e.status === status);
    if (dept !== 'all') rows = rows.filter((e) => e.department === dept);
    if (q) rows = rows.filter((e) => `${e.firstName} ${e.lastName} ${e.role} ${e.department} ${e.email}`.toLowerCase().includes(q));
    return rows;
  }, [employees, status, dept, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    if (currentPage > pageCount) setPage(pageCount);
  }, [currentPage, pageCount]);

  useEffect(() => {
    setSelected([]);
  }, [dept, status, q]);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const fullName = (e) => `${e.firstName} ${e.lastName}`.trim();

  const isAllSelected = filtered.length > 0 && selected.length === filtered.length;

  const toggleSelect = (id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const toggleSelectAll = () => {
    if (isAllSelected) setSelected([]);
    else setSelected(filtered.map((e) => e.id));
  };

  const clearSelection = () => setSelected([]);

  const bulkDelete = () => {
    if (!selected.length) return;
    setConfirmId('__bulk__');
  };

  const handleBulkStatus = (newStatus) => {
    if (!selected.length) return;
    selected.forEach((id) => updateEmployee(id, { status: newStatus }));
    const n = selected.length;
    notify(`${t('emp.bulkStatusDone')} — ${n} ${n === 1 ? t('emp.unit') : t('emp.units')}`);
    setSelected([]);
  };

  const doDelete = () => {
    if (confirmId === '__bulk__') {
      selected.forEach((id) => deleteEmployee(id));
      setSelected([]);
      setConfirmId(null);
      const n = selected.length;
      notify(`${t('action.delete')} — ${n} ${n === 1 ? t('emp.unit') : t('emp.units')}`);
    } else if (confirmId) {
      deleteEmployee(confirmId);
      setConfirmId(null);
      notify(t('action.delete'));
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (e) => {
    setForm({ ...e });
    setErrors({});
    setEditing(e);
    setModalOpen(true);
  };

  const submit = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = t('emp.firstReq');
    if (!form.lastName.trim()) errs.lastName = t('emp.lastReq');
    if (!form.email.trim() || !form.email.includes('@')) errs.email = t('emp.emailReq');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = { ...form };
    if (editing) {
      updateEmployee(editing.id, payload);
      notify(`${fullName(payload)} ${t('action.edit')}`);
    } else {
      addEmployee(payload);
      notify(`${fullName(payload)} ${t('action.addEmployee')}`);
    }
    setModalOpen(false);
  };

  const pageNumbers = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= PAGE_WINDOW) {
        nums.push(i);
      } else if (nums[nums.length - 1] !== '…') {
        nums.push('…');
      }
    }
    return nums;
  }, [pageCount, currentPage]);

  const start = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const header = ['ID', 'First Name', 'Last Name', 'Department', 'Role', 'Email', 'Status'];
    const rows = filtered.map((e) => [e.id, e.firstName, e.lastName, e.department, e.role, e.email, e.status]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noffice-employees.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify('Berhasil mengekspor data karyawan (CSV)');
  };

  return (
    <>
      <Breadcrumb crumbs={[{ label: t('breadcrumb.home'), to: '/dashboard' }, { label: t('emp.title') }]} />
      <PageHeader
        title={t('emp.title')}
        subtitle={t('emp.subtitle')}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" icon="download" onClick={exportCSV} disabled={filtered.length === 0}>
              {t('action.export')}
            </Button>
            <Button variant="primary" icon="userPlus" onClick={openAdd}>
              {t('action.addEmployee')}
            </Button>
          </div>
        }
      />

      <div className="table-controls emp-controls">
        <select className="filter-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label={t('status.allDepts')}>
          <option value="all">{t('status.allDepts')}</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('status.all')}>
          <option value="all">{t('status.all')}</option>
          {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</option>)}
        </select>

        <div className="bulk-actions">
          {selected.length > 0 && (
            <span className="bulk-selected">{t('emp.selected', { count: selected.length })}</span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setBulkOpen((v) => !v)}
            disabled={selected.length === 0}
            aria-haspopup="listbox"
            aria-expanded={bulkOpen}
          >
            <span className="btn-icon"><Icon name="dots" size={16} /></span>
            {t('emp.bulk')}
          </button>
          {bulkOpen && selected.length > 0 && (
            <div className="bulk-menu" role="listbox">
              <button className="bulk-item" role="option" onClick={() => { handleBulkStatus('Active'); setBulkOpen(false); }}>
                <Icon name="check" size={15} /> {t('emp.bulkActive')}
              </button>
              <button className="bulk-item" role="option" onClick={() => { handleBulkStatus('Inactive'); setBulkOpen(false); }}>
                <Icon name="x" size={15} /> {t('emp.bulkInactive')}
              </button>
              <button className="bulk-item bulk-danger" role="option" onClick={() => { bulkDelete(); setBulkOpen(false); }}>
                <Icon name="trash" size={15} /> {t('emp.bulkDelete')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="employees"
            title={t('emp.empty.title')}
            description={t('emp.empty.desc')}
            action={<Button variant="primary" icon="userPlus" onClick={openAdd}>{t('action.addEmployee')}</Button>}
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table emp-table">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input
                        type="checkbox"
                        aria-label={t('emp.bulkToggle')}
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>{t('emp.col.employee')}</th>
                    <th>{t('emp.col.dept')}</th>
                    <th>{t('emp.col.role')}</th>
                    <th>{t('emp.col.email')}</th>
                    <th>{t('emp.col.status')}</th>
                    <th>{t('emp.col.joined')}</th>
                    <th>{t('emp.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e) => (
                    <tr key={e.id} className={selected.includes(e.id) ? 'selected' : ''}>
                      <td className="col-check" data-label="">
                        <input
                          type="checkbox"
                          aria-label={`${t('emp.bulkToggle')} ${fullName(e)}`}
                          checked={selected.includes(e.id)}
                          onChange={() => toggleSelect(e.id)}
                        />
                      </td>
                      <td data-label={t('emp.col.employee')}>
                        <div className="employee-cell">
                          <Avatar name={fullName(e)} size="sm" />
                          <div>
                            <div className="emp-name">{fullName(e)}</div>
                            {e.email && <div className="cell-sub">{e.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td data-label={t('emp.col.dept')}>{e.department}</td>
                      <td data-label={t('emp.col.role')}>{e.role}</td>
                      <td className="cell-email" data-label={t('emp.col.email')}><span className="cell-trunc">{e.email}</span></td>
                      <td data-label={t('emp.col.status')}><Badge status={e.status.toLowerCase()} /></td>
                      <td className="cell-date" data-label={t('emp.col.joined')}>{e.dateJoined || '—'}</td>
                      <td className="cell-actions" data-label={t('emp.col.actions')}>
                        <span className="row-actions">
                          <button className="action-btn" onClick={() => openEdit(e)} aria-label={`${t('action.edit')} ${fullName(e)}`}><Icon name="edit" size={16} /></button>
                          <button className="action-btn" onClick={() => setConfirmId(e.id)} aria-label={`${t('action.delete')} ${fullName(e)}`}><Icon name="trash" size={16} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-footer pagination">
              <div className="pagination-info">
                {t('table.showing')} {start}–{end} {t('emp.of')} {filtered.length} {t('emp.activeEmployeesLower')}
                {selected.length > 0 && (
                  <button className="clear-selection" onClick={clearSelection}>{t('emp.clearSelection')} ({selected.length})</button>
                )}
              </div>
              <div className="page-btns">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label={t('emp.prev')}>←</button>
                {pageNumbers.map((n, i) =>
                  n === '…' ? (
                    <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                  ) : (
                    <button
                      key={n}
                      className={`page-btn ${n === currentPage ? 'active' : ''}`}
                      onClick={() => setPage(n)}
                      aria-label={`${t('emp.goToPage')} ${n}`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button className="page-btn" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Halaman berikutnya">→</button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('emp.edit.title') : t('emp.add.title')}
        wide
        footerContent={
          <div className="modal-footer-btns">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('action.cancel')}</Button>
            <Button variant="primary" icon="save" onClick={submit}>{t('action.save')}</Button>
          </div>
        }
      >
        <div className="form-row">
          <FormField label={t('emp.first')} htmlFor="emp-first" required error={errors.firstName}>
            <input className="form-input" id="emp-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} aria-invalid={!!errors.firstName} />
          </FormField>
          <FormField label={t('emp.last')} htmlFor="emp-last" required error={errors.lastName}>
            <input className="form-input" id="emp-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} aria-invalid={!!errors.lastName} />
          </FormField>
        </div>
        <div className="form-row">
          <FormField label={t('emp.dept')} htmlFor="emp-dept">
            <select className="form-select" id="emp-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">—</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label={t('emp.role')} htmlFor="emp-role">
            <input className="form-input" id="emp-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </FormField>
        </div>
        <div className="form-row">
          <FormField label={t('emp.email')} htmlFor="emp-email" required error={errors.email}>
            <input className="form-input" id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
          </FormField>
          <FormField label={t('emp.status')} htmlFor="emp-status">
            <select className="form-select" id="emp-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={confirmId === '__bulk__' ? t('emp.bulkDeleteTitle') : t('emp.delete.title')}
        message={confirmId === '__bulk__' ? t('emp.bulkDeleteMsg', { count: selected.length }) : t('emp.delete.msg')}
        confirmLabel={t('action.delete')}
        onCancel={() => setConfirmId(null)}
        onConfirm={doDelete}
      />
    </>
  );
}