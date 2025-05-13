import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import { useAsyncError, useNavigate } from 'react-router-dom'
import Notification from './Notification';
import '../styles/Home.css';


const Home = () => {
    const [roomId, setRoomId] = useState('')
    const [username, setUsername] = useState('')
    const [showNotification, setShowNotification] = useState(false)
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    const visitRoom = () => {
        if(!roomId || !username){
            setMessage('Enter Room ID and Username')
            setShowNotification(true)
            setTimeout(() => {
                setShowNotification(false);
              }, 1500);
            return;
        }

        navigate(`/editor/${roomId}`, {
            state : {
                username, 
            }
        });

    }

    const createRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        setRoomId(id);
        setMessage('Room Created')
        setShowNotification(true);
        setTimeout(() => {
            setShowNotification(false);
          }, 1500);
    }

    return (
        <>
        {showNotification && <Notification message={message}/>}
        <h1>Welcome to Code Collab</h1>
            <div className='inputs'>
                <input className='enterRoomId' placeholder='Room ID' value={roomId} onChange={(e) => {setRoomId(e.target.value)}}/>
                <input className='enterUsername' placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)}/>
                <button className='travelButton' onClick={visitRoom}>Join Room</button>
                <button className='createButton' onClick={createRoom}>Create Room</button>
            </div>
        </>
    )
}

export default Home
