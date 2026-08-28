import { useState } from 'react';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';

export default function Topbar({ title, searchValue, onSearch, onMenu, onNotify }) {
  return (
    <header className="topbar">
      <button
        className="icon-btn menu-toggle"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Icon name="documents" size={20} />
      </button>

      <span className="topbar-title">{title}</span>

      <div className="topbar-search" role="search">
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input
          type="search"
          placeholder="Search documents, employees, submissions..."
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search"
        />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" aria-label="Notifications" onClick={onNotify}>
          <Icon name="bell" size={20} />
          <span className="icon-dot" aria-hidden="true" />
        </button>
        <button className="topbar-profile" aria-label="Profile">
          <Avatar name="Noffice User" />
          <span className="p-namewrap">
            <span className="p-name">Noffice User</span>
            <div className="p-role">Administrator</div>
          </span>
          <Icon name="chevronDown" size={16} />
        </button>
      </div>
    </header>
  );
}
