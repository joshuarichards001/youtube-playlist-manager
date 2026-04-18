interface Props {
  onLogin: () => void;
}

export default function LoginButton({ onLogin }: Props) {
  return (
    <button className="btn btn-primary" onClick={onLogin}>
      Login with Google
    </button>
  );
}
