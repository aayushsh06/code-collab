import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import CodeEditor from './CodeEditor'
import { initSocket } from '../socket.js'
import { ACTIONS } from '../Actions.js'
import Notification from './Notification.jsx'

import '../styles/Editor.css'


const Editor = () => {
  // Notification Handling
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef(null);
  const [message, setMessage] = useState('');

  const showNotificationWithTimeout = (msg) => {
    setMessage(msg);
    setShowNotification(true);

    if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
    }

    notificationTimeoutRef.current = setTimeout(() => {
        setShowNotification(false);
        notificationTimeoutRef.current = null; 
    }, 1500);
};

const [users, setUsers] = useState([])

  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));

      function handleErrors(e) {
        console.log('socket error', e);
        showNotification('An Error Occurred');
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // JOINED
      socketRef.current.on(ACTIONS.JOINED, ({users, username, socketId}) => {
        if(username != location.state?.username) {
          showNotificationWithTimeout(`${username} Joined`)
        }
        setUsers(users);
      })

      // DISCONNECT
      socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, username}) => {
        showNotificationWithTimeout(`${username} Left`);
        setUsers((prev) => {
          return prev.filter(user => user.socketId != socketId);
        })
      })
    }
    init();
  }, []);

  return (
    <div className='editor'>
      {showNotification && <Notification message={message}/>}
      <div className='info'>
        <div className='users'>
          <h1>Active Users</h1>
          {
            users.map(client => (
              <h2 key={client.socketId}>{client.username}</h2>
            ))}
        </div>
        <div className='actions'>
          <button className='copy-room'> Copy Room Id</button>
          <button className='leave-room' onClick={() => navigate('/code-collab')}>Leave Room</button>
        </div>
      </div>
      <div className='code-editor'>
        <CodeEditor />
      </div>
    </div>
  )
}

export default Editor
