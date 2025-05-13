import { useState } from 'react'
import { useNavigate } from 'react-router-dom' 
import CodeEditor from './CodeEditor'

const Editor = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([
    {socketId: 1, username: 'Aayush'},
    {socketId: 2, username: 'John Pork'}
  ])

  return (
    <>
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
    </>
  )
}

export default Editor
