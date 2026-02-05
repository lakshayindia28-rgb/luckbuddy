function NotificationBanner({ text }) {
  if (!text) return null;

  return (
    <div className="alert alert-warning text-center mb-3">
      {text}
    </div>
  );
}

export default NotificationBanner;
