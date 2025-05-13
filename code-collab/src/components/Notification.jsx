import React, { useEffect, useState } from 'react';
import '../styles/Notification.css'

const Notification = ({ message }) => {

  return (
    <div className='notification'>
      {message}
    </div>
  );
};


export default Notification;
