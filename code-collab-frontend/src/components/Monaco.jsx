import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import "../styles/Monaco.css";

const SUPPORTED_LANGUAGES = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

const configureMonaco = () => {
  Object.keys(SUPPORTED_LANGUAGES).forEach(lang => {
    monaco.languages.register({ id: lang });
  });

  monaco.editor.defineTheme('vs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
    }
  });

  monaco.editor.defineTheme('vs-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    }
  });

  monaco.editor.defineTheme('hc-black', {
    base: 'hc-black',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#000000',
    }
  });
};

configureMonaco();

const Monaco = ({ 
  language = 'javascript',
  value = '',
  onChange = () => {},
  readOnly = false,
  theme = 'vs-dark'
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      value: value || `// Start coding in ${SUPPORTED_LANGUAGES[language]}...`,
      language,
      theme,
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      readOnly,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true,
      autoIndent: 'full',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      folding: true,
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoSurround: 'brackets',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });

    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange(newValue);
    });

    editorRef.current = editor;

    return () => {
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  return (
    <div 
      ref={containerRef} 
      className="monaco-editor-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Monaco;