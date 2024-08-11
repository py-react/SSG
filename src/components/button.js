"use client"
import React from 'react';

const ButtonComponent = () => {
    React.useEffect(() => {
        const button = document.querySelector('#interactive-button');
        if (button) {
            button.addEventListener('click', () => {
                alert('Button clicked!');
            });
        }
    }, []);

    return <button id="interactive-button">Click me</button>;
};

export default ButtonComponent;