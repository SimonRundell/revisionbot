import React, {useState, useEffect} from 'react';

function CMFloatAd({color = '#ffffff', bgColor = 'transparent'}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const bottomLabelStyle = {
        position: 'fixed',
        bottom: '10px',
        right: '20px',
        width: '30px',
        maxWidth: '30px',
        height: isMobile && isHovered ? 'auto' : '50px',
        minHeight: isMobile && isHovered ? '80px' : '50px',
        padding: '10px',
        paddingRight: isMobile ? '44px' : '44px',
        backgroundColor: bgColor,
        color: color,
        fontSize: isMobile ? 'xx-small' : 'x-small',
        whiteSpace: isMobile && isHovered ? 'normal' : 'nowrap',
        overflow: 'hidden',
        transition: 'max-width 1s ease-in-out, width 1s ease-in-out, height 1s ease-in-out',
        display: 'flex',
        alignItems: isMobile && isHovered ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        flexDirection: isMobile && isHovered ? 'column' : 'row',
        lineHeight: isMobile ? '1.2' : 'normal',
      };

      const hoverStyle = isHovered ? {
        maxWidth: isMobile ? '90%' : '75%',
        width: '100%',
        border: '1px solid #747474',
        paddingRight: isMobile ? '10px' : '40px',
      } : {};

      // Mobile-specific styles for content
      const contentStyle = {
        display: 'flex',
        alignItems: isMobile && isHovered ? 'flex-start' : 'center',
        gap: '5px',
        flexDirection: isMobile && isHovered ? 'column' : 'row',
        width: '100%',
      };

      const textContentStyle = {
        display: isMobile && isHovered ? 'flex' : 'inline',
        flexDirection: isMobile && isHovered ? 'column' : 'row',
        fontSize: isMobile ? 'xx-small' : 'inherit',
        lineHeight: isMobile ? '1.2' : 'normal',
        gap: isMobile && isHovered ? '2px' : '0',
      };

      const cmLogo = "data:image/png;base64,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"

const currentYear = new Date().getFullYear();
return (
  <>
    <div
      style={{ ...bottomLabelStyle, ...hoverStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={contentStyle}>
        <img alt="cm-logo" src={cmLogo} height="40" width="40" />
        {isMobile && isHovered ? (
          <div style={textContentStyle}>
            <span>&copy; {currentYear} CodeMonkey Design Ltd.</span>
            <span>20 Clifton Ave, Plymouth, UK, PL7 4BJ</span>
            <span>Tel: 07976 802123</span>
            <span>
              eMail:{' '}
              <a
                href="mailto:support@codemonkey.design"
                style={{ color: color, textDecoration: 'none' }}
              >
                support@codemonkey.design
              </a>
            </span>
          </div>
        ) : !isMobile ? (
          <span>
            &nbsp;&copy; {currentYear} CodeMonkey Design Ltd. | 20 Clifton Ave, Plymouth, UK, PL7 4BJ | Tel: 07976 802123 | eMail:{' '}
            <a
              href="mailto:support@codemonkey.design"
              style={{ color: color, textDecoration: 'none' }}
            >
              support@codemonkey.design
            </a>
          </span>
        ) : null}
      </div>
    </div>
  </>
);

}

export default CMFloatAd;