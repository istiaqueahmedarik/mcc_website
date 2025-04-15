import React from 'react';

export const FireMarker = (
  props
) => {
  const { element } = props;

  return (
    <div contentEditable={false}>
      <span
        className="select-none"
        style={{ left: -26, position: 'absolute', top: -1 }}
        data-plate-prevent-deserialization
        contentEditable={false}>
        {(element).indent % 2 === 0 ? '🔥' : '🚀'}
      </span>
    </div>
  );
};

export const FireLiComponent = (props) => {
  const { children } = props;

  return <li className="list-none">{children}</li>;
};
