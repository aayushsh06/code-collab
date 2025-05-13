import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ACTIONS } from '../Actions';
import '../styles/CodeEditor.css';

const CodeEditor = ({socketRef, roomId}) => {
  const [language, setLanguage] = useState('javascript');
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    console.log('Mounted Code Editor');
  
    let isRemoteUpdate = false;
  
    editor.onDidChangeModelContent(() => {
      if (isRemoteUpdate) return;
  
      const code = editor.getValue();
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code,
      });
    });
  
    socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
      if (code !== null) {
        isRemoteUpdate = true;
        editor.setValue(code);
        isRemoteUpdate = false;
      }
    });
  };

  return (
    <div className="code-editor-wrapper">
      <div className="code-editor-header">
        <label htmlFor="language">Language:</label>
        <select
          id="language"
          className="code-editor-dropdown"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
      </div>

      <Editor
        height="100vh"
        language={language}
        defaultLanguage={language}
        defaultValue="// Write your code here"
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          wordWrap: 'on',
        }}
      />
    </div>
  );
};


export default CodeEditor;
