import React from 'react';

const Navbar = ({ username, onLogout, onNavigate }) => (
  <header className="header">
    <h1>Quiz App</h1>
    <nav className="navbar">
      {username ? (
        <>
          <a href="#" onClick={() => onNavigate('home')}>Home</a>
          <a href="#" onClick={() => onNavigate('profile')}>Profile</a>
          <a href="#" onClick={onLogout}>Logout</a>
        </>
      ) : (
        <>
          <button onClick={() => onNavigate('login')}>Login</button>
          <button onClick={() => onNavigate('register')}>Register</button>
        </>
      )}
    </nav>
  </header>
);

export default Navbar;
