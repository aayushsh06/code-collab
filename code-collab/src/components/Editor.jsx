import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import CodeEditor from './CodeEditor';
import { initSocket } from '../socket.js';
import { ACTIONS } from '../Actions.js';
import Notification from './Notification.jsx';

import '../styles/Editor.css';

const Editor = () => {

  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef(null);
  const [message, setMessage] = useState('');
  const editorRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

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

  const [users, setUsers] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();

  const handleLeaveRoom = () => {
    showNotificationWithTimeout("Leaving room...");
    

    if (socketRef.current) {
      try {
        socketRef.current.emit(ACTIONS.CURSOR_LEAVE, {
          roomId,
          username: location.state?.username || 'Anonymous'
        });
        
        socketRef.current.emit(ACTIONS.DISCONNECTED, {
          socketId: socketRef.current.id,
          username: location.state?.username || 'Anonymous',
          roomId
        });
        
        setTimeout(() => {
          socketRef.current.disconnect();
          
          navigate('/');
        }, 300);
      } catch (error) {

        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => {
        showNotificationWithTimeout('Room ID Copied to Clipboard');
      })
      .catch((err) => {
        showNotificationWithTimeout('Error Occurred, Try Again');
      });
  };

  const socketRef = useRef(null);

  const requestCodeFromServer = () => {
    if (socketRef.current && roomId) {
      socketRef.current.emit(ACTIONS.SYNC_CODE, { roomId });
    }
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));
      
      socketRef.current.on('connect', () => {
        setIsConnected(true);
        requestCodeFromServer();
      });

      function handleErrors(e) {
        showNotificationWithTimeout('An Error Occurred');
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit(ACTIONS.REQUEST_CODE, { roomId });
        }
      }, 300);

      socketRef.current.on(ACTIONS.JOINED, ({ users, username, socketId }) => {
        if (username !== location.state?.username) {
          showNotificationWithTimeout(`${username} Joined`);
        }
        setUsers(users);
        
        setTimeout(() => {
          requestCodeFromServer();
        }, 500); 
      });
      
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        showNotificationWithTimeout(`${username} Left`);
        setUsers((prev) => {
          return prev.filter(user => user.socketId !== socketId);
        });
      });
    };

    init();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socketRef.current) {
        requestCodeFromServer();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener('focus', requestCodeFromServer);
    return () => {
      window.removeEventListener('focus', requestCodeFromServer);
    };
  }, [isConnected]);

  return (
    <div className="editor">
      {showNotification && <Notification message={message} />}
      <div className="info">
        <div className="users">
          <h1>Active Users</h1>
          {users.map(client => (
            <h2 key={client.socketId}>{client.username}</h2>
          ))}
        </div>
        <div className="actions">
          <button className="copy-room" onClick={handleCopyRoomId}> Copy Room Id</button>
          <button className="leave-room" onClick={handleLeaveRoom}>Leave Room</button>
        </div>
      </div>
      <div className="code-editor">
        <CodeEditor socketRef={socketRef} roomId={roomId} editorRef={editorRef} />
      </div>
    </div>
  );
};

export default Editor;