const BlinkingDot = ({ visible }) => (
  <span
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      marginRight: 8,
      backgroundColor: '#4caf50',
      borderRadius: '50%',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.1s linear',
    }}
  />
);

export default BlinkingDot;