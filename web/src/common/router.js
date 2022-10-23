import {useLocation, useNavigate, useParams, useSearchParams} from "react-router-dom";

export const withRouter = (Component) => {
    return (props) => {
        const location = useLocation();
        const navigate = useNavigate();
        const params = useParams();
        const searchParams = useSearchParams();
        return <Component {...props} location={location} navigate={navigate} params={params} searchParams={searchParams}/>;
    };
}