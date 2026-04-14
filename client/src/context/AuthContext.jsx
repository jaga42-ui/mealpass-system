import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = () => {
            const storedUserStr = localStorage.getItem('mealpass_user');
            const token = localStorage.getItem('mealpass_token');
            
            if (storedUserStr && token) {
                // We no longer kick them out here. We let the Router handle them.
                setUser(JSON.parse(storedUserStr));
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const userData = response.data.user;

        // We no longer throw an error. We let them log in, but Login.jsx will route them to the lobby.
        localStorage.setItem('mealpass_token', response.data.token);
        localStorage.setItem('mealpass_user', JSON.stringify(userData));
        setUser(userData);
        return response.data;
    };

    const register = async (email, password) => {
        const response = await api.post('/auth/register', { email, password });
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('mealpass_token');
        localStorage.removeItem('mealpass_user');
        setUser(null);
    };

    return (
        // 👇 Notice we added 'setUser' to the exports so PendingScreen can use it!
        <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};