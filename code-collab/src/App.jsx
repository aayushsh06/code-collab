import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from '/components/Home'
import Editor from './components/Editor'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/code-collab" element={<Home/>} />
        <Route path="/code-collab/editor/:roomId" element={<Editor/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
