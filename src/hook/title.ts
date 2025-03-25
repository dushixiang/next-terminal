import strings from "../utils/strings";

export const setTitle = (title: string | undefined) => {
    let titles = document.title.split('｜');
    if (strings.hasText(title)) {
        document.title = titles[0] + '｜' + title;
    } else {
        document.title = titles[0];
    }
}