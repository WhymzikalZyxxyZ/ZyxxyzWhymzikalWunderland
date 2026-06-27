interface Props { message: string; }

export function ErrorBanner({ message }: Props) {
    return (
        <div className="error-banner" role="alert">
            <strong>Something went wrong:</strong> {message}
        </div>
    );
}
