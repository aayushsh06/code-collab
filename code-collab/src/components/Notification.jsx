import React, { useEffect, useState } from 'react';
import '../styles/Notification.css';
import { FiBell } from 'react-icons/fi';

const Notification = ({ message }) => {
  return (
    <div className='notification'>
      <FiBell className="notification-bell" />
      {message}
    </div>
  );
};

export default Notification;
