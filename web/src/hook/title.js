import {hasText} from "../utils/utils";

export const setTitle = (title) => {
    let titles = document.title.split('｜');
    if (hasText(title)) {
        document.title = titles[0] + '｜' + title;
    } else {
        document.title = titles[0];
    }
}