import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = () => {
            const storedUser = localStorage.getItem('mealpass_user');
            const token = localStorage.getItem('mealpass_token');
            
            if (storedUser && token) {
                setUser(JSON.parse(storedUser));
            }
            setIsLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('mealpass_token', response.data.token);
        localStorage.setItem('mealpass_user', JSON.stringify(response.data.user));
        setUser(response.data.user);
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
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};