import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import Login from './Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        login: mockLogin,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <BrowserRouter>
            <I18nProvider>{ui}</I18nProvider>
        </BrowserRouter>
    );
}

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = vi.fn();
    });

    it('should render the login form correctly', () => {
        renderWithProviders(<Login />);

        expect(screen.getByRole('heading', { name: /Connexion/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Connexion$/i })).toBeInTheDocument();
    });

    it('should call API, login user, and navigate on successful login', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };
        const mockToken = 'fake-jwt-token';

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ user: mockUser, token: mockToken }),
        });

        renderWithProviders(<Login />);

        fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Connexion$/i }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.any(Object));
        });
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken);
        });
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('should display an error message on failed login', async () => {
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: 'Identifiants invalides' }),
        });

        renderWithProviders(<Login />);

        fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpassword' } });
        fireEvent.click(screen.getByRole('button', { name: /Connexion$/i }));

        expect(await screen.findByText('Identifiants invalides')).toBeInTheDocument();
        expect(mockLogin).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
