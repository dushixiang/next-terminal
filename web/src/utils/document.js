export const setTitle = (title) => {
    let titles = document.title.split('｜');
    document.title = titles[0] + '｜' + title;
}