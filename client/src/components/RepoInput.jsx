import { ArrowRight } from "lucide-react";

const RepoInput = ({ value, onChange, onSubmit, isLoading }) => (
  <form className="repo-input-wrap reveal-item" onSubmit={onSubmit}>
    <input
      className="repo-input"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="https://github.com/owner/repo"
      disabled={isLoading}
    />
    <button className="btn-accent" type="submit" disabled={isLoading}>
      {isLoading ? "Analyzing..." : "Analyze"}
      <ArrowRight size={16} />
    </button>
  </form>
);

export default RepoInput;
