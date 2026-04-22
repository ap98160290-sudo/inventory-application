from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import datetime


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    product_id = Column(String, index=True)  # barcode (NOT globally unique)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="products")

    product_name = Column(String, nullable=False)
    description = Column(String, nullable=False)

    quantity = Column(Float, nullable=False)

    unit_of_measure = Column(String, nullable=False)

    display_unit = Column(String, nullable=False)

    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)

    low_stock_threshold=Column(Float, default=50)
    aliases = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)   # False = marked inactive (soft delete)

    transactions = relationship(
        "Transaction",
        back_populates="product",
        cascade="all, delete",
        passive_deletes=True,
    )

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("product_id", "owner_id", name="uix_product_owner"),
    )


class OTP(Base):
    __tablename__ = "otp"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    is_verified = Column(Boolean, default=False)

    products = relationship("Product", back_populates="owner", cascade="all, delete")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    #  Integer FK referencing products.id (the real PK) — type is correct,
    # but log_transactions was passing product.product_id (a string barcode) instead of product.id
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_name_snapshot = Column(String, nullable=True)   # preserved after product deletion

    quantity = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)

    timestamp = Column(DateTime, default=datetime.utcnow)

    unit = Column(String, nullable=False)
    profit = Column(Float, nullable=True)
    price_per_unit = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    note = Column(String, nullable=True)          # write-off reason: damaged/expired/freebie/stolen/spillage

    product = relationship("Product", back_populates="transactions")



class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    id          = Column(Integer, primary_key=True, index=True)
    token       = Column(String, unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime, default=datetime.utcnow)