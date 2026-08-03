import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import Register from './Register';

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

describe('Register Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = vi.fn();
    });

    it('should render the registration form correctly', () => {
        renderWithProviders(<Register />);

        expect(screen.getByRole('heading', { name: /Inscription/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Créer un compte/i })).toBeInTheDocument();
    });

    it('should show an error if passwords do not match', async () => {
        renderWithProviders(<Register />);

        fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'test@example.com' } });
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'password456' } });

        fireEvent.click(screen.getByRole('button', { name: /Créer un compte/i }));

        expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should call the API, login the user, and navigate on successful registration', async () => {
        const mockUser = { id: 1, email: 'test@example.com' };
        const mockToken = 'fake-jwt-token';

        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ user: mockUser, token: mockToken }),
        });

        renderWithProviders(<Register />);

        fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'test@example.com' } });
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Créer un compte/i }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/register'), expect.any(Object));
        });

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith(mockUser, mockToken);
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('should display an error message on failed registration', async () => {
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: 'Cet email est déjà utilisé.' }),
        });

        renderWithProviders(<Register />);

        fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText('votre@email.com'), { target: { value: 'test@example.com' } });
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Créer un compte/i }));

        expect(await screen.findByText('Cet email est déjà utilisé.')).toBeInTheDocument();
        expect(mockLogin).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
