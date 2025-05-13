import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ACTIONS } from '../Actions';
import '../styles/CodeEditor.css';


const getRandomColor = () => {
  const colors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', 
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', 
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41', 
    '#FFD740', '#FFAB40', '#FF6E40'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const CodeEditor = ({ socketRef, roomId }) => {
  const [language, setLanguage] = useState('javascript');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const cursorDecorations = useRef({});
  const selectionDecorations = useRef({});
  const userColor = useRef(getRandomColor());
  
  const username = location.state?.username;

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

    editor.onDidChangeCursorPosition((event) => {
      if (!socketRef.current) return;
      
      const { position } = event;
      socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
        roomId,
        position,
        username,
        color: userColor.current
      });
    });

    editor.onDidChangeCursorSelection((event) => {
      if (!socketRef.current) return;
      
      const { selection } = event;
      socketRef.current.emit(ACTIONS.SELECTION_CHANGE, {
        roomId,
        selection,
        username,
        color: userColor.current
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

    const handleCursorChange = ({ position, username: remoteUsername, color }) => {
      if (!editorRef.current || !monacoRef.current || remoteUsername === username) return;
      
      const cursorDecoration = {
        range: new monacoRef.current.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: 'remote-cursor',
          hoverMessage: { value: remoteUsername },
          beforeContentClassName: 'remote-cursor-content',
          before: {
            content: '|',
            inlineClassName: `remote-cursor-${remoteUsername.replace(/\s+/g, '-')}`
          }
        }
      };

      addCursorStyle(remoteUsername, color);

      if (cursorDecorations.current[remoteUsername]) {
        editorRef.current.deltaDecorations(
          cursorDecorations.current[remoteUsername],
          [cursorDecoration]
        );
      } else {
        cursorDecorations.current[remoteUsername] = editorRef.current.deltaDecorations(
          [],
          [cursorDecoration]
        );
      }
    };

    const handleSelectionChange = ({ selection, username: remoteUsername, color }) => {
      if (!editorRef.current || !monacoRef.current || remoteUsername === username) return;
      
      const selectionDecoration = {
        range: new monacoRef.current.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        ),
        options: {
          className: `remote-selection-${remoteUsername.replace(/\s+/g, '-')}`,
          hoverMessage: { value: `${remoteUsername}'s selection` },
        }
      };

      addSelectionStyle(remoteUsername, color);

      if (selectionDecorations.current[remoteUsername]) {
        editorRef.current.deltaDecorations(
          selectionDecorations.current[remoteUsername],
          [selectionDecoration]
        );
      } else {
        selectionDecorations.current[remoteUsername] = editorRef.current.deltaDecorations(
          [],
          [selectionDecoration]
        );
      }
    };

    const addCursorStyle = (remoteUsername, color) => {
      const styleId = `cursor-style-${remoteUsername.replace(/\s+/g, '-')}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .remote-cursor-${remoteUsername.replace(/\s+/g, '-')} {
            background-color: ${color};
            color: white;
            width: 2px !important;
            position: absolute;
          }
          .remote-cursor-content {
            position: absolute;
            top: -1.3em;
            left: -2px;
            z-index: 100;
            font-size: 0.8em;
            padding: 2px 4px;
            border-radius: 2px;
            white-space: nowrap;
          }
        `;
        document.head.appendChild(style);
      }
    };

    const addSelectionStyle = (remoteUsername, color) => {
      const styleId = `selection-style-${remoteUsername.replace(/\s+/g, '-')}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .remote-selection-${remoteUsername.replace(/\s+/g, '-')} {
            background-color: ${color}40; /* 40 = 25% opacity */
            border: 1px solid ${color};
          }
        `;
        document.head.appendChild(style);
      }
    };

    console.log('Setting up CODE_CHANGE listener');
    socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    socketRef.current.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);
    socketRef.current.on(ACTIONS.SELECTION_CHANGE, handleSelectionChange);

    return () => {
      if (socketRef.current) {
        console.log('Removing listeners');
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_CHANGE);
        socketRef.current.off(ACTIONS.SELECTION_CHANGE);
      }
    };
  }, [socketRef.current, roomId, username]);

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