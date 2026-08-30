import { useMemo, useState } from 'react';
import { useStore, DEPARTMENTS, EMPLOYEE_STATUSES } from '../store/StoreContext.jsx';
import { useSearch } from '../components/Layout.jsx';
import { useToast } from '../store/ToastContext.jsx';
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

export default function Employees() {
  const { query } = useSearch();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirmId, setConfirmId] = useState(null);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = employees;
    if (status !== 'all') rows = rows.filter((e) => e.status === status);
    if (dept !== 'all') rows = rows.filter((e) => e.department === dept);
    if (q) rows = rows.filter((e) => `${e.firstName} ${e.lastName} ${e.role} ${e.department} ${e.email}`.toLowerCase().includes(q));
    return rows;
  }, [employees, status, dept, q]);

  const fullName = (e) => `${e.firstName} ${e.lastName}`.trim();

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

  const doDelete = () => {
    if (!confirmId) return;
    deleteEmployee(confirmId);
    setConfirmId(null);
    notify(t('action.delete'));
  };

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

      <div className="table-controls">
        <select className="filter-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label={t('status.allDepts')}>
          <option value="all">{t('status.allDepts')}</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('status.all')}>
          <option value="all">{t('status.all')}</option>
          {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</option>)}
        </select>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('emp.col.employee')}</th>
                    <th>{t('emp.col.dept')}</th>
                    <th>{t('emp.col.role')}</th>
                    <th>{t('emp.col.email')}</th>
                    <th>{t('emp.col.status')}</th>
                    <th>{t('emp.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="employee-cell">
                          <Avatar name={fullName(e)} size="sm" />
                          <div>
                            <div className="emp-name">{fullName(e)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{e.department}</td>
                      <td>{e.role}</td>
                      <td className="cell-email">{e.email}</td>
                      <td><Badge status={e.status.toLowerCase()} /></td>
                      <td>
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
            <div className="card-footer pagination-info">{filtered.length} {t('emp.subtitle').toLowerCase()}</div>
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
        title={t('emp.delete.title')}
        message={t('emp.delete.msg')}
        confirmLabel={t('action.delete')}
        onCancel={() => setConfirmId(null)}
        onConfirm={doDelete}
      />
    </>
  );
}
