import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ACTIONS } from '../Actions';
import '../styles/CodeEditor.css';

const CodeEditor = ({ socketRef, roomId }) => {
  const [language, setLanguage] = useState('javascript');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    console.log('Mounted Code Editor');

    editor.onDidChangeModelContent((event) => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      if (!socketRef.current) {
        console.warn('Socket not initialized yet. Cannot emit code changes.');
        return;
      }

      const changes = event.changes.map(change => ({
        range: change.range,
        text: change.text,
      }));
      
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        changes,
      });
    });
  };

  useEffect(() => {
    if (!socketRef.current) {
      console.log('Waiting for socket initialization...');
      return;
    }

    const handleCodeChange = ({ changes }) => {
      if (!editorRef.current || !monacoRef.current || !changes) return;
      
      isRemoteUpdateRef.current = true;

      try {
        const edits = changes.map((change) => ({
          range: new monacoRef.current.Range(
            change.range.startLineNumber,
            change.range.startColumn,
            change.range.endLineNumber,
            change.range.endColumn
          ),
          text: change.text,
          forceMoveMarkers: true,
        }));

        editorRef.current.executeEdits('remote', edits);
      } catch (error) {
        console.error('Error applying remote changes:', error);
        isRemoteUpdateRef.current = false; 
      }
    };

    console.log('Setting up CODE_CHANGE listener');
    socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);

    return () => {
      if (socketRef.current) {
        console.log('Removing CODE_CHANGE listener');
        socketRef.current.off(ACTIONS.CODE_CHANGE);
      }
    };
  }, [socketRef.current, roomId]);

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
        height="90vh"
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