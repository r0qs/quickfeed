import * as React from "react";
import { BootstrapButton } from "../../components";

import { CourseManager } from "../../managers/CourseManager";

import { NavigationManager } from "../../managers/NavigationManager";

import { Course, Organization, Status, User, Void } from "../../../proto/ag_pb";

interface ICourseFormProps {
    className?: string;
    courseMan: CourseManager;
    navMan: NavigationManager;
    pagePath: string;
    courseData?: Course; // for editing an existing course
    curUser?: User;  // to make current user info accessible
    providers: string[];
}

interface ICourseFormStates {
    name: string;
    code: string;
    tag: string;
    year: string;
    provider: string;
    orgid: number;
    organisations: JSX.Element | null;
    errorFlash: JSX.Element | null;
    clicked: boolean;
}

class CourseForm<T> extends React.Component<ICourseFormProps, ICourseFormStates> {
    constructor(props: any) {
        super(props);
        this.state = {
            name: this.props.courseData ? this.props.courseData.getName() : "",
            code: this.props.courseData ? this.props.courseData.getCode() : "",
            tag: this.props.courseData ? this.props.courseData.getTag() : "",
            year: this.props.courseData ? this.props.courseData.getYear().toString() : "",
            provider: this.props.courseData ? this.props.courseData.getProvider() : "",
            orgid: this.props.courseData ? this.props.courseData.getOrganizationid() : 0,
            organisations: null,
            errorFlash: null,
            clicked: false,
        };
    }

    public render() {
        const getTitleText: string = this.props.courseData ? "Edit Course" : "Create New Course";
        return (
            <div>
                <h1>{getTitleText}</h1>
                {this.state.errorFlash}
                <form className={this.props.className ? this.props.className : ""}
                    onSubmit={(e) => this.handleFormSubmit(e)}>
                    <div className="form-group">
                        <label className="control-label col-sm-2">Provider:</label>
                        <div className="col-sm-10">
                            {this.renderProviders()}
                        </div>
                    </div>
                    <div className="form-group" id="organisation-container">
                        <label className="control-label col-sm-2">Information:</label>
                        <div className="col-sm-10">
                            {this.renderInfo()}
                        </div>
                        {this.state.organisations}
                    </div>
                    {this.renderFormControler("Course Name:",
                        "Enter course name",
                        "name",
                        this.state.name,
                        (e) => this.handleInputChange(e))}
                    {this.renderFormControler("Course code:",
                        "Enter course code",
                        "code",
                        this.state.code,
                        (e) => this.handleInputChange(e))}
                    {this.renderFormControler("Course year:",
                        "Enter year",
                        "year",
                        this.state.year,
                        (e) => this.handleInputChange(e))}
                    {this.renderFormControler("Semester:",
                        "Enter semester",
                        "tag",
                        this.state.tag,
                        (e) => this.handleInputChange(e))}

                    <div className="form-group">
                        <div className="col-sm-offset-2 col-sm-10">
                            <BootstrapButton classType="primary" type="submit">
                                {this.setButtonString()}
                            </BootstrapButton>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    private renderInfo(): JSX.Element {
        const gitMsg: JSX.Element =
            <div>
                <p>Select a GitHub organization for your course.
                (Don't see your organization below? Autograder needs access to your organization.
            Grant access <a href="https://github.com/settings/applications" target="_blank"> here</a>.)</p>

                <p>For each new semester of a course, Autograder requires a new GitHub organization.
            This is to keep the student roster for the different runs of the course separate.</p>

                <p><b>Create an organization for your course.</b> When you
                 <a href="https://github.com/account/organizations/new" target="_blank">create an organization</a>,
                 be sure to select the “Free Plan.”</p>

                <p><b>Important:</b> <i>Don't create any repositories in your GitHub organization yet;
                    Autograder will create a repository structure for you.</i></p>

                <p><b>Apply for an Educator discount.</b></p>
                <p>For teachers, GitHub is happy to upgrade your organization to serve private repositories.
                    Go ahead an apply for an
                     <a href="https://education.github.com/discount_requests/new" target="_blank">Education discount</a>
                     for your GitHub organization.</p>
                <p>Wait for your organization to be upgraded by GitHub.</p>
                <p>Return to this page when your organization has been upgraded, to create the course.
                    This will allow Autograder to create the appropriate repository structure.</p>
                <p>Once these repositories have been created by Autograder: </p>
                <div>
                    <ul>
                        <li>course-info</li>
                        <li>assignments</li>
                        <li>solutions</li>
                        <li>tests</li>
                    </ul>
                </div>
                <p>You can populate these with your course's content.</p>
                <p>Only the assignments and tests repositories must contain meta-data and tests
                    for Autograder to function.</p>
                <p>Please read the documentation for further instructions on how to work with
                    the various repositories.</p>
            </div>;
        return gitMsg;
    }

    private renderProviders(): JSX.Element | JSX.Element[] {
        let providers;
        if (this.props.providers.length > 1) {
            providers = this.props.providers.map((provider, index: number) => {
                return <label className="radio-inline" key={index}>
                    <input type="radio"
                        name="provider"
                        value={provider}
                        defaultChecked={this.props.courseData
                            && this.props.courseData.getProvider() === provider ? true : false}
                        onClick={() => this.getOrganizations(provider)}
                    />{provider}
                </label>;
            });
        } else {
            const curProvider = this.props.providers[0];
            providers = <label className="radio-inline">
                <input type="hidden"
                    name="provider"
                    value={curProvider}
                />{curProvider}
            </label>;
            if (this.state.provider !== curProvider) {
                this.getOrganizations(curProvider);
            }
        }
        return providers;
    }

    private renderFormControler(
        title: string,
        placeholder: string,
        name: string,
        value: any,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    ) {
        return <div className="form-group">
            <label className="control-label col-sm-2" htmlFor="name">{title}</label>
            <div className="col-sm-10">
                <input type="text" className="form-control"
                    id={name}
                    placeholder={placeholder}
                    name={name}
                    value={value}
                    onChange={onChange}
                />
            </div>
        </div>;
    }

    private async handleFormSubmit(e: React.FormEvent<any>) {
        e.preventDefault();
        const errors: string[] = this.courseValidate();
        this.setState({
            clicked: true,
        });
        if (errors.length > 0) {
            const flashErrors = this.getFlashErrors(errors);
            this.setState({
                errorFlash: flashErrors,
            });
        } else {
            const result = this.props.courseData ?
                await this.updateCourse(this.props.courseData.getId()) : await this.createNewCourse();

            if ((result instanceof Status) && (result.getCode() > 0)) {
                const errMsg = result.getError();
                const serverErrors: string[] = [];
                serverErrors.push(errMsg);
                const flashErrors = this.getFlashErrors(serverErrors);
                this.setState({
                    errorFlash: flashErrors,
                });
            } else {
                const redirectTo: string = this.props.pagePath + "/courses";
                this.props.navMan.navigateTo(redirectTo);
            }
        }
        this.setState({
            clicked: false,
        });
    }

    private async updateCourse(courseId: number): Promise<Void | Status> {
        const courseData = new Course();
        courseData.setId(courseId);
        courseData.setName(this.state.name);
        courseData.setCode(this.state.code);
        courseData.setTag(this.state.tag);
        courseData.setYear(parseInt(this.state.year, 10));
        courseData.setProvider(this.state.provider);
        courseData.setOrganizationid(this.state.orgid);

        return this.props.courseMan.updateCourse(courseId, courseData);
    }

    private async createNewCourse(): Promise<Course | Status> {
        const courseData = new Course();
        courseData.setName(this.state.name);
        courseData.setCode(this.state.code);
        courseData.setTag(this.state.tag);
        courseData.setYear(parseInt(this.state.year, 10));
        courseData.setProvider(this.state.provider);
        courseData.setOrganizationid(this.state.orgid);

        return this.props.courseMan.createNewCourse(courseData);
    }

    private handleInputChange(e: React.FormEvent<any>) {
        const target: any = e.target;
        const value = target.type === "checkbox" ? target.checked : target.value;
        const name = target.name as "name";

        this.setState({
            [name]: value,
        });
    }

    private handleOrgClick(e: any, dirId: number) {
        const elem = e.target;
        if (dirId) {
            this.setState({
                orgid: dirId,
            });
            let sibling = elem.parentNode.firstChild;
            for (; sibling; sibling = sibling.nextSibling) {
                if (sibling.nodeType === 1) {
                    sibling.classList.remove("alert-success");
                }
            }
            elem.classList.add("alert-success");
        }
    }

    private async getOrganizations(provider: string): Promise<void> {
        const orgs = await this.props.courseMan.getOrganizations(provider);
        this.setState({
            provider,
            errorFlash: null,
        });
        this.updateOrganisationDivs(orgs);
    }

    private updateOrganisationDivs(orgs: Organization[]): void {
        const organisationDetails: JSX.Element[] = [];
        for (let i: number = 0; i < orgs.length; i++) {
            organisationDetails.push(
                <button type="button" key={i} className="btn organisation"
                    onClick={(e) => this.handleOrgClick(e, orgs[i].getId())}
                    title={orgs[i].getPath()}>

                    <div className="organisationInfo">
                        <img src={orgs[i].getAvatar()}
                            className="img-rounded"
                            width={80}
                            height={80} />
                        <div className="caption">{orgs[i].getPath()}</div>
                    </div>
                    <input type="radio" />
                </button>,
            );

        }

        let orgMsg: JSX.Element;
        if (this.state.provider === "github") {
            orgMsg = <div>
                <p>List of available GitHub organizations:</p>
            </div>;
        } else {
            orgMsg = <p>Select a GitLab group.</p>;
        }

        const orgDivs: JSX.Element = <div>
            <label className="control-label col-sm-2">Organization:</label>
            <div className="organisationWrap col-sm-10">
                {orgMsg}
                <div className="btn-group organisationBtnGroup" data-toggle="buttons">
                    {organisationDetails}
                </div>
            </div>
        </div>;

        this.setState({
            organisations: orgDivs,
            orgid: 0,
        });
    }

    private courseValidate(): string[] {
        const errors: string[] = [];
        if (this.state.name === "") {
            errors.push("Course name cannot be blank");
        }
        if (this.state.code === "") {
            errors.push("Course tag cannot be blank.");
        }
        if (this.state.tag === "") {
            errors.push("Semester cannot be blank.");
        }
        if (this.state.provider === "") {
            errors.push("Provider cannot be blank.");
        }
        if (this.state.orgid === 0) {
            errors.push("Organisation cannot be blank.");
        }
        const year = parseInt(this.state.year, 10);
        if (this.state.year === "") {
            errors.push("Year cannot be blank.");
        } else if (Number.isNaN(year)) {
            errors.push("Year must be a number");
        } else if (year < (new Date()).getFullYear()) {
            errors.push("Year must be greater or equal to current year");
        }
        return errors;
    }

    private getFlashErrors(errors: string[]): JSX.Element {
        const errorArr: JSX.Element[] = [];
        for (let i: number = 0; i < errors.length; i++) {
            errorArr.push(<li key={i}>{errors[i]}</li>);
        }
        const flash: JSX.Element =
            <div className="alert alert-danger">
                <h4>{errorArr.length} errors prevented new course creation: </h4>
                <ul>
                    {errorArr}
                </ul>
            </div>;
        return flash;
    }

    private setButtonString(): string {
        let str: string;
        // TODO (vera): is there a more elegant way to do this check?
        // I can rewrite it as a pure conditional, as linter wants, but it will be unreadable
        if (this.state.clicked) {
            str = this.props.courseData ? "Updating" : "Creating";
        } else {
            str = this.props.courseData ? "Update" : "Create";
        }
        return str;
    }

}
export { CourseForm };
