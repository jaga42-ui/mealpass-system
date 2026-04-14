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
                const storedUser = JSON.parse(storedUserStr);
                
                // 🛑 GATEKEEPER 1: Boot them on initial load if still pending
                if (storedUser.role === 'pending') {
                    localStorage.removeItem('mealpass_token');
                    localStorage.removeItem('mealpass_user');
                    setUser(null);
                } else {
                    setUser(storedUser);
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const userData = response.data.user;

        // 🛑 GATEKEEPER 2: Block login execution BEFORE saving the session
        if (userData.role === 'pending') {
            throw new Error('Your account is still pending Admin approval.');
        }

        // Only save and set if they are approved
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
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};