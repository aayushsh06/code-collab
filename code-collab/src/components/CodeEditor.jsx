import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ACTIONS } from '../Actions';
import { useLocation } from 'react-router-dom';
import Notification from './Notification.jsx';
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

const CodeEditor = ({ socketRef, roomId, editorRef }) => {
  const [language, setLanguage] = useState('javascript');
  const [codeVersion, setCodeVersion] = useState(0);

  const monacoRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const cursorDecorations = useRef({});
  const selectionDecorations = useRef({});
  const userColor = useRef(getRandomColor());
  const isLanguageChangingRef = useRef(false);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const timeOutRef = useRef(null);
  const notificationDuration = 3000;

  //Notification
  const showNotificationWithTimeout = (message) => {
    if (timeOutRef.current) {
      clearTimeout(timeOutRef.current);
    }
    setNotificationMessage(message);
    setShowNotification(true);
    timeOutRef.current = setTimeout(() => {
      setShowNotification(false);
      timeOutRef.current = null;
    }, notificationDuration);
  };

  const location = useLocation();

  const username = location.state?.username || `User-${Date.now().toString().slice(-4)}`;

  const clearAllDecorations = () => {
    if (!editorRef.current) return;

    Object.keys(cursorDecorations.current).forEach(user => {
      if (cursorDecorations.current[user]) {
        editorRef.current.deltaDecorations(cursorDecorations.current[user], []);
        delete cursorDecorations.current[user];
      }
    });

    Object.keys(selectionDecorations.current).forEach(user => {
      if (selectionDecorations.current[user]) {
        editorRef.current.deltaDecorations(selectionDecorations.current[user], []);
        delete selectionDecorations.current[user];
      }
    });

    document.querySelectorAll('[id^="cursor-style-"]').forEach(el => el.remove());
    document.querySelectorAll('[id^="selection-style-"]').forEach(el => el.remove());
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    clearAllDecorations();

    const cancelTokenSource = new monaco.CancellationTokenSource();
    editorRef.current._cancelTokenSource = cancelTokenSource;

    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      const editorContainer = editorDomNode.closest('.monaco-editor');
      if (editorContainer) {
        editorContainer.style.padding = '0';
      }
    }

    setTimeout(() => {
      editor.layout();

      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.focus();
    }, 100);

    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.REQUEST_CODE, { roomId, clientVersion: codeVersion });
    }

    editor.onDidBlurEditorWidget(() => {
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.CURSOR_LEAVE, {
          roomId,
          username
        });
      }
    });

    editor.onDidChangeModelContent((event) => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      if (!socketRef.current) {
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

      const currentCode = editor.getValue();
      socketRef.current.emit(ACTIONS.SEND_CURRENT_CODE, {
        roomId,
        code: currentCode,
        clientVersion: codeVersion
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

  const addCurrentUserStyle = () => {
    const styleId = 'cursor-style-current-user';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .monaco-editor .cursor {
          background-color: ${userColor.current} !important;
          border-color: ${userColor.current} !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  const handleLanguageChange = (newLanguage) => {
    if (isLanguageChangingRef.current) {
      isLanguageChangingRef.current = false;
      return;
    }

    setLanguage(newLanguage);

    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
        roomId,
        language: newLanguage,
        username
      });
    }

  };

  useEffect(() => {
    if (!socketRef.current) {
      return;
    }

    addCurrentUserStyle();

    const handleClickOutside = (event) => {
      if (editorRef.current) {
        const editorDomNode = editorRef.current.getDomNode();
        if (editorDomNode && !editorDomNode.contains(event.target)) {
          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CURSOR_LEAVE, {
              roomId,
              username
            });
          }
        }
      }
    };


    document.addEventListener('mousedown', handleClickOutside);

    const handleUserDisconnected = ({ socketId, username }) => {
      if (!editorRef.current || !username) return;

      if (cursorDecorations.current[username]) {
        editorRef.current.deltaDecorations(cursorDecorations.current[username], []);
        delete cursorDecorations.current[username];
      }

      if (selectionDecorations.current[username]) {
        editorRef.current.deltaDecorations(selectionDecorations.current[username], []);
        delete selectionDecorations.current[username];
      }

      const cursorStyleId = `cursor-style-${username.replace(/\s+/g, '-')}`;
      const selectionStyleId = `selection-style-${username.replace(/\s+/g, '-')}`;

      const cursorStyle = document.getElementById(cursorStyleId);
      const selectionStyle = document.getElementById(selectionStyleId);

      if (cursorStyle) cursorStyle.remove();
      if (selectionStyle) selectionStyle.remove();
    };

    socketRef.current.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

    const updateEditorContent = (code, version) => {
      if (!editorRef.current || !code) return;

      try {
        isRemoteUpdateRef.current = true;

        const model = editorRef.current.getModel();
        if (!model) return;

        const fullRange = model.getFullModelRange();

        const currentValue = model.getValue();
        if (currentValue !== code) {
          editorRef.current.executeEdits('direct-update', [{
            range: fullRange,
            text: code,
            forceMoveMarkers: true
          }]);

          if (version > codeVersion) {
            setCodeVersion(version);
          }
        }
      } catch (error) {
      } finally {
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 100);
      }
    };

    socketRef.current.emit(ACTIONS.REQUEST_CODE, { roomId, clientVersion: codeVersion });

    socketRef.current.on(ACTIONS.SYNC_CODE_RESPONSE, ({ code, version, upToDate }) => {
      if (upToDate) {
        if (version > codeVersion) {
          setCodeVersion(version);
        }
        return;
      }

      if (code && typeof code === 'string' && (!version || version >= codeVersion)) {
        updateEditorContent(code, version || 0);
      }
    });

    const saveCodeBeforeUnload = () => {
      if (editorRef.current && socketRef.current) {
        const currentCode = editorRef.current.getValue();
        socketRef.current.emit(ACTIONS.SEND_CURRENT_CODE, {
          roomId,
          code: currentCode
        });
      }
    };

    window.addEventListener('beforeunload', saveCodeBeforeUnload);

    const handleCodeChange = ({ changes }) => {
      if (!editorRef.current || !monacoRef.current || !changes) return;

      isRemoteUpdateRef.current = true;

      try {
        const model = editorRef.current.getModel();
        if (!model) return;

        const lineCount = model.getLineCount();

        const edits = changes.map((change) => {
          try {
            const startLineNumber = Math.max(1, Math.min(change.range.startLineNumber, lineCount));
            const startMaxColumn = model.getLineMaxColumn(startLineNumber);
            const startColumn = Math.max(1, Math.min(change.range.startColumn, startMaxColumn));

            const endLineNumber = Math.max(1, Math.min(change.range.endLineNumber, lineCount));
            const endMaxColumn = model.getLineMaxColumn(endLineNumber);
            const endColumn = Math.max(1, Math.min(change.range.endColumn, endMaxColumn));

            return {
              range: new monacoRef.current.Range(
                startLineNumber,
                startColumn,
                endLineNumber,
                endColumn
              ),
              text: change.text,
              forceMoveMarkers: true,
            };
          } catch (err) {
            return null;
          }
        }).filter(edit => edit !== null);

        if (edits.length > 0) {
          editorRef.current.executeEdits('remote', edits);
        }
      } catch (error) {
      } finally {
        isRemoteUpdateRef.current = false;
      }
    };

    const handleCursorChange = ({ position, username: remoteUsername, color }) => {
      if (!editorRef.current || !monacoRef.current || remoteUsername === username) return;

      const model = editorRef.current.getModel();
      if (!model) return;
      try {
        const lineCount = model.getLineCount();
        const lineNumber = Math.max(1, Math.min(position.lineNumber, lineCount));

        if (lineNumber <= lineCount) {
          const maxColumn = model.getLineMaxColumn(lineNumber);
          const column = Math.max(1, Math.min(position.column, maxColumn));

          const validatedPosition = {
            lineNumber,
            column
          };

          if (cursorDecorations.current[remoteUsername]) {
            editorRef.current.deltaDecorations(cursorDecorations.current[remoteUsername], []);
            delete cursorDecorations.current[remoteUsername];
          }

          if (validatedPosition.column === maxColumn) {
            const cursorDecoration = {
              range: new monacoRef.current.Range(
                validatedPosition.lineNumber,
                validatedPosition.column - 1,
                validatedPosition.lineNumber,
                validatedPosition.column
              ),
              options: {
                className: 'cursor-container',
                hoverMessage: { value: remoteUsername },
                before: {
                  content: ' ',
                  inlineClassName: `user-cursor-${remoteUsername}`,
                },
              }
            };
            const styleId = `cursor-style-${remoteUsername}`;
            let styleEl = document.getElementById(styleId);

            if (styleEl) {
              styleEl.remove();
            }

            styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.innerHTML = `
            .user-cursor-${remoteUsername} {
              background-color: ${color};
              color: ${color};
              width: 2px !important;
              position: absolute;
              z-index: 1000;
              animation: user-cursor-blink-${remoteUsername} 1.5s infinite;
              transform: translateX(8px);
            }
            
            .user-cursor-${remoteUsername}::before {
              content: "${remoteUsername}";
              background-color: ${color};
              color: white;
              border-radius: 3px;
              padding: 1px;
              font-size: 12px;
              position: absolute;
              top: -20px;
              left: 0;
              white-space: nowrap;
              z-index: 1000;
              transform: translateX(30%);
            }
            
            @keyframes user-cursor-blink-${remoteUsername} {
              0% { opacity: 1; }
              40% { opacity: 1; }
              45% { opacity: 0; }
              55% { opacity: 0; }
              60% { opacity: 1; }
              100% { opacity: 1; }
            }
          `;

            document.head.appendChild(styleEl);

            cursorDecorations.current[remoteUsername] = editorRef.current.deltaDecorations(
              cursorDecorations.current[remoteUsername] || [],
              [cursorDecoration]
            );


          }
          else {


            const cursorDecoration = {
              range: new monacoRef.current.Range(
                validatedPosition.lineNumber,
                validatedPosition.column,
                validatedPosition.lineNumber,
                validatedPosition.column + 1
              ),
              options: {
                className: 'cursor-container',
                hoverMessage: { value: remoteUsername },
                before: {
                  content: ' ',
                  inlineClassName: `user-cursor-${remoteUsername}`,
                },
                /*after: {
                  content: ` ${remoteUsername}`,
                  inlineClassName: `user-cursor-label-${remoteUsername}`
                } */
              }
            };

            const styleId = `cursor-style-${remoteUsername}`;
            let styleEl = document.getElementById(styleId);

            if (styleEl) {
              styleEl.remove();
            }

            styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.innerHTML = `
            .user-cursor-${remoteUsername} {
              background-color: ${color};
              color: ${color};
              width: 2px !important;
              position: absolute;
              z-index: 1000;
              animation: user-cursor-blink-${remoteUsername} 1s infinite;
              transform: translateX(0px);
            }
            
            .user-cursor-${remoteUsername}::before {
              content: "${remoteUsername}";
              background-color: ${color};
              color: white;
              border-radius: 3px;
              padding: 1px;
              font-size: 12px;
              position: absolute;
              top: -20px;
              left: 0;
              white-space: nowrap;
              z-index: 1000;
              transform: translateX(30%);
            }
            
            @keyframes user-cursor-blink-${remoteUsername} {
              0% { opacity: 1; }
              40% { opacity: 1; }
              45% { opacity: 0; }
              55% { opacity: 0; }
              60% { opacity: 1; }
              100% { opacity: 1; }
            }
          `;


            document.head.appendChild(styleEl);


            cursorDecorations.current[remoteUsername] = editorRef.current.deltaDecorations(
              cursorDecorations.current[remoteUsername] || [],
              [cursorDecoration]
            );
          }
        }
      } catch (error) {
        console.error("Error handling cursor change:", error);
      }
    };

    const handleSelectionChange = ({ selection, username: remoteUsername, color }) => {
      if (!editorRef.current || !monacoRef.current || remoteUsername === username) return;

      const model = editorRef.current.getModel();
      if (!model) return;

      if (selection.startLineNumber === selection.endLineNumber && selection.startColumn === selection.endColumn) {
        return;
      }
      console.log('Selection changed');
      try {
        const lineCount = model.getLineCount();

        const startLineNumber = Math.max(1, Math.min(selection.startLineNumber, lineCount));
        const startMaxColumn = model.getLineMaxColumn(startLineNumber);
        const startColumn = Math.max(1, Math.min(selection.startColumn, startMaxColumn));

        const endLineNumber = Math.max(1, Math.min(selection.endLineNumber, lineCount));
        const endMaxColumn = model.getLineMaxColumn(endLineNumber);
        const endColumn = Math.max(1, Math.min(selection.endColumn, endMaxColumn));

        const selectionDecoration = {
          range: new monacoRef.current.Range(
            startLineNumber,
            startColumn,
            endLineNumber,
            endColumn
          ),
          options: {
            className: `user-selection-${remoteUsername}`,
            hoverMessage: { value: `${remoteUsername}'s selection` },
          }
        };

        const styleId = `user-selection-style-${remoteUsername}`;
        let styleEl = document.getElementById(styleId);

        if (styleEl) {
          styleEl.remove();
        }

        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          .user-selection-${remoteUsername} {
            background-color: ${color}70;
            outline: 1px solid ${color};
            position: relative;
          }
          
          .user-selection-${remoteUsername}::before {
            content: "${remoteUsername}";
            position: absolute;
            top: -20px;
            left: 100%;
            background-color: ${color};
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10;
            animation: user-selection-blink-${remoteUsername} 3s infinite;
          }
          
          @keyframes user-selection-blink-${remoteUsername} {
            0% { opacity: 0.7; }
            50% { opacity: 0.0; }
            100% { opacity: 0.7; }
          }
        `;


        document.head.appendChild(styleEl);

        if (selectionDecorations.current[remoteUsername]) {
          editorRef.current.deltaDecorations(selectionDecorations.current[remoteUsername], []);
        }

        selectionDecorations.current[remoteUsername] = editorRef.current.deltaDecorations(
          selectionDecorations.current[remoteUsername] || [],
          [selectionDecoration]
        );
      } catch (error) {
      }
    };

    const handleCursorLeave = ({ username: leavingUsername }) => {
      if (!editorRef.current || !leavingUsername) return;

      if (cursorDecorations.current[leavingUsername]) {
        editorRef.current.deltaDecorations(cursorDecorations.current[leavingUsername], []);
        delete cursorDecorations.current[leavingUsername];
      }

    };

    const handleRequestCurrentCode = ({ roomId: requestRoomId }) => {
      if (!editorRef.current || requestRoomId !== roomId) return;

      const currentCode = editorRef.current.getValue();
      socketRef.current.emit(ACTIONS.SEND_CURRENT_CODE, {
        roomId,
        code: currentCode
      });
    };

    const forceSaveCurrentCode = () => {
      if (!editorRef.current || !socketRef.current) return;

      const currentCode = editorRef.current.getValue();

      socketRef.current.emit(ACTIONS.SEND_CURRENT_CODE, {
        roomId,
        code: currentCode,
        force: true,
        clientVersion: codeVersion
      });
    };

    const saveInterval = setInterval(forceSaveCurrentCode, 5000);

    const languageMap = {
      javascript: 'JavaScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++'
    };

    const handleLanguageUpdate = ({ language: newLanguage, username: remoteUsername }) => {
      if (remoteUsername !== username) {
        isLanguageChangingRef.current = true;
        setLanguage(newLanguage);
      }
      showNotificationWithTimeout(`${remoteUsername} changed language to ${languageMap[newLanguage]}`);
    };

    socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);
    socketRef.current.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);
    socketRef.current.on(ACTIONS.SELECTION_CHANGE, handleSelectionChange);
    socketRef.current.on(ACTIONS.REQUEST_CURRENT_CODE, handleRequestCurrentCode);
    socketRef.current.on(ACTIONS.CURSOR_LEAVE, handleCursorLeave);
    socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, handleLanguageUpdate);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', saveCodeBeforeUnload);

      document.removeEventListener('mousedown', handleClickOutside);

      clearAllDecorations();

      if (editorRef.current && editorRef.current._cancelTokenSource) {
        editorRef.current._cancelTokenSource.cancel();
      }

      if (editorRef.current && editorRef.current.dispose) {
        try {
          editorRef.current.dispose();
        } catch (error) {
          console.log('Error disposing editor:', error);
        }
      }

      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_CHANGE);
        socketRef.current.off(ACTIONS.SELECTION_CHANGE);
        socketRef.current.off(ACTIONS.REQUEST_CURRENT_CODE);
        socketRef.current.off(ACTIONS.CURSOR_LEAVE);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
      }
    };
  }, [socketRef.current, roomId, username]);

  return (
    <>
      <div className="notification-container">
        {showNotification && <Notification message={notificationMessage} />}
      </div>
      <div className="code-editor-wrapper">
        <div className="code-editor-header">
          <label htmlFor="language">Language:</label>
          <select
            id="language"
            className="code-editor-dropdown"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="monaco-editor-container" style={{ margin: '20px 0 0 20px' }}>
          <Editor
            height="100%"
            width="100%"
            language={language}
            defaultLanguage={language}
            defaultValue="// Write your code here"
            theme="vs-dark"
            onMount={handleEditorDidMount}
            keepCurrentModel={true}
            overrideServices={{
              editorCursorStyle: 'line-thin',
              editorCursorBlinking: 'solid',
              editorCursorSmoothCaretAnimation: true,
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              cursorStyle: 'line-thin',
              cursorWidth: 1,
              renderWhitespace: 'none',
              renderLineHighlight: 'all',
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              renderValidationDecorations: 'on',
              fixedOverflowWidgets: true,
              autoIndent: 'advanced',
              useTabStops: true,
              highlightActiveIndentGuide: true,
              renderIndentGuides: true,
              scrollbar: {
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12,
              },
              padding: {
                top: 20,
                bottom: 10,
              }
            }}
          />
        </div>
      </div>
    </>
  );
};

export default CodeEditor;