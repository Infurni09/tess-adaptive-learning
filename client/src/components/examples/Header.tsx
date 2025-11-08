import Header from '../Header';

export default function HeaderExample() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-4">Authenticated State:</p>
        <Header 
          isAuthenticated={true} 
          userName="John Doe" 
          onLogout={() => console.log('Logout clicked')} 
        />
      </div>
      <div className="mt-20">
        <p className="text-sm text-muted-foreground mb-4">Guest State:</p>
        <Header isAuthenticated={false} />
      </div>
    </div>
  );
}
