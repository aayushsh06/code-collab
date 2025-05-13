import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import '../styles/CodeEditor.css';

const CodeEditor = () => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Write your code here');

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
        defaultLanguage={language}
        language={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value)}
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
