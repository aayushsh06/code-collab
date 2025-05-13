import React, { useEffect, useState } from 'react';

const Notification = ({ message }) => {

  return (
    <div style={styles.notification}>
      {message}
    </div>
  );
};

const styles = {
  notification: {
    backgroundColor: '#00a1ff',
    color: '#fff',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    position: 'fixed',
    top: '20px',
    right: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 1000,
    fontSize: '1rem',
    transition: 'opacity 0.3s ease',
  }
};

export default Notification;
