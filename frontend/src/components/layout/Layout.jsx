import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AiChatbot from '../common/AiChatbot';

const Layout = () => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Navbar />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
    <AiChatbot />
  </div>
);

export default Layout;
