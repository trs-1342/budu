import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  rightSlot?: React.ReactNode;
};

export default function FormInput({ label, error, rightSlot, ...rest }: Props) {
  return (
    <div className="form__group">
      <label className="label">{label}</label>
      {rightSlot ? (
        <div className="input--with-btn">
          <input className="input" {...rest} />
          {rightSlot}
        </div>
      ) : (
        <input className="input" {...rest} />
      )}
      {error ? (
        <div className="err" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
