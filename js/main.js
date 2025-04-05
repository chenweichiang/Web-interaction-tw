// 等待 DOM 完全載入後執行
document.addEventListener('DOMContentLoaded', function() {
    // 滑動導航效果
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 獲取目標區塊
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            // 滑動到目標區塊
            window.scrollTo({
                top: targetSection.offsetTop - 70, // 減去導航欄的高度
                behavior: 'smooth'
            });
        });
    });
    
    // 滾動時為導航欄添加陰影效果
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        
        if (window.scrollY > 0) {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
    });
    
    // 作品集項目點擊效果
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach(item => {
        item.addEventListener('click', function() {
            // 這裡可以添加點擊作品後的行為，例如顯示詳細資訊或彈出視窗
            console.log('作品項目被點擊');
        });
    });
});