import React from 'react';

interface EditorDagGraphProps {
  containerRef: (node: HTMLDivElement) => void;
}

const EditorDagGraph: React.FC<EditorDagGraphProps> = ({ containerRef }) => {
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default EditorDagGraph;
