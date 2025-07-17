from pydolphinscheduler.models import Tenant

def main():
    Tenant.get_tenant()
    print("Hello from backend!")


if __name__ == "__main__":
    main()
