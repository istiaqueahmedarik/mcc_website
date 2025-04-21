import { useEffect, useState } from 'react';
import { useThemeValue } from '@gravity-ui/uikit';
import { getYfmHtmlBlockCssVariables } from '@gravity-ui/markdown-editor/view/hocs/withYfmHtml/utils';

const variablesMapping = {
    colorBackground: '--g-color-base-background',
    colorTextPrimary: '--g-color-text-primary',
    colorTextSecondary: '--g-color-text-secondary',
    fontFamily: '--g-font-family-sans',
    fontSize: '--g-text-body-1-font-size',
};

export const useYfmHtmlBlockStyles = () => {
    const theme = useThemeValue();
    const [config, setConfig] = useState();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const bodyStyles = window.getComputedStyle(document.body);

        const styles = Object.entries(variablesMapping).reduce(
            (acc, [key, cssVariable]) => {
                acc[key] = bodyStyles.getPropertyValue(cssVariable);
                return acc;
            },
            {}
        );

        setConfig({
            styles: getYfmHtmlBlockCssVariables(styles),
            classNames: [theme],
            resizePadding: 50,
            resizeDelay: 100,
        });
    }, [theme]);

    return config;
};